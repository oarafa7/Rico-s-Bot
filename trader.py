
import asyncio
import time
from typing import Dict, Any, List, Optional
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from loguru import logger
from datetime import datetime, timedelta

from config import BotConfig
from utils import (
    create_solana_client, 
    load_keypair, 
    get_jupiter_quote, 
    simulate_jupiter_swap,
    execute_jupiter_swap,
    check_token_price,
    is_honeypot,
    is_contract_verified
)

class TokenTrader:
    def __init__(self, config: BotConfig):
        """Initialize the token trader."""
        self.config = config
        self.client = None
        self.keypair = None
        self.active_trades: Dict[str, Dict[str, Any]] = {}
        self.running = False
        self.last_trade_time = time.time() - self.config.cooldown_period  # Initialize to allow immediate trading
        
    async def initialize(self):
        """Initialize the trader."""
        self.client = await create_solana_client(self.config.rpc_url)
        self.keypair = load_keypair(self.config.private_key)
        logger.info(f"Token trader initialized for wallet: {self.keypair.pubkey()}")
        
    async def handle_new_token(self, token_address: str, token_metadata: Dict[str, Any]):
        """Handle a newly listed token."""
        try:
            logger.info(f"Evaluating new token: {token_metadata.get('name', 'Unknown')} ({token_address})")
            
            # Check if we're in cooldown period
            if time.time() - self.last_trade_time < self.config.cooldown_period:
                logger.info(f"In cooldown period, skipping token: {token_address}")
                return
            
            # Check if we're already trading this token
            if token_address in self.active_trades:
                logger.warning(f"Already trading {token_address}, skipping")
                return
                
            # Check if we've reached the maximum number of open trades
            if len(self.active_trades) >= self.config.max_open_trades:
                logger.warning(f"Maximum number of open trades reached ({self.config.max_open_trades}), skipping")
                return
            
            # Check if token is in whitelist/blacklist
            if self.config.token_whitelist and token_address not in self.config.token_whitelist:
                logger.info(f"Token {token_address} not in whitelist, skipping")
                return
                
            if self.config.token_blacklist and token_address in self.config.token_blacklist:
                logger.info(f"Token {token_address} in blacklist, skipping")
                return
            
            # Check minimum liquidity
            liquidity = await self.check_token_liquidity(token_address)
            if liquidity < self.config.minimum_liquidity:
                logger.info(f"Token {token_address} liquidity too low: {liquidity} USDC (minimum: {self.config.minimum_liquidity})")
                return
            
            # Check if contract is verified if required
            if self.config.require_verified_contract:
                is_verified = await is_contract_verified(token_address)
                if not is_verified:
                    logger.info(f"Token {token_address} contract not verified, skipping")
                    return
            
            # Check for anti-bot mechanisms if enabled
            if self.config.enable_antibot:
                is_bot_protected = await self.check_antibot_protection(token_address)
                if is_bot_protected:
                    logger.warning(f"Anti-bot protection detected for {token_address}, skipping")
                    return
                
            # Calculate swap amount based on position size
            balance = await self.get_wallet_usdc_balance()
            swap_amount = min(
                self.config.swap_amount_usdc,
                balance * (self.config.position_size_percentage / 100)
            )
            
            if swap_amount <= 0:
                logger.warning(f"Insufficient balance for trade, skipping {token_address}")
                return
            
            # Simulate a swap to check for issues/honeypots
            simulation_success, quote = await simulate_jupiter_swap(
                self.client,
                self.keypair,
                self.config.usdc_address,
                token_address,
                swap_amount,
                self.config.slippage
            )
            
            if not simulation_success or not quote:
                logger.warning(f"Simulation failed for {token_address}, skipping")
                return
                
            # Check for honeypot
            if is_honeypot(quote):
                logger.warning(f"Potential honeypot detected for {token_address}, skipping")
                return
                
            # Execute the swap
            logger.info(f"Executing swap for {swap_amount} USDC -> {token_metadata.get('name', 'Unknown')}")
            tx_sig = await execute_jupiter_swap(
                self.client, 
                self.keypair, 
                quote,
                priority_fee=self.config.max_priority_fee
            )
            
            if not tx_sig:
                logger.error(f"Swap execution failed for {token_address}")
                return
                
            logger.info(f"Swap executed successfully! Tx: {tx_sig}")
            
            # Record the trade
            entry_price = await check_token_price(
                token_address,
                self.config.usdc_address,
                1.0  # Just checking the price of 1 token
            )
            
            trade_info = {
                "token_address": token_address,
                "token_name": token_metadata.get("name", "Unknown"),
                "token_symbol": token_metadata.get("symbol", "UNKNOWN"),
                "entry_price": entry_price,
                "amount_usdc_spent": swap_amount,
                "tx_sig": tx_sig,
                "timestamp": time.time(),
                "entry_time": datetime.now(),
            }
            
            # Update last trade time
            self.last_trade_time = time.time()
            
            self.active_trades[token_address] = trade_info
            
            # Start monitoring the price
            asyncio.create_task(self.monitor_token_price(token_address, trade_info))
            
        except Exception as e:
            logger.error(f"Error handling new token {token_address}: {e}")
            
    async def monitor_token_price(self, token_address: str, trade_info: Dict[str, Any]):
        """Monitor token price and sell when target or stop-loss is hit."""
        try:
            entry_price = trade_info["entry_price"]
            if entry_price <= 0:
                logger.warning(f"Invalid entry price for {token_address}, using placeholder")
                entry_price = 1.0  # Placeholder for demonstration
                
            token_name = trade_info.get("token_name", "Unknown")
            logger.info(f"Starting price monitoring for {token_name} (Entry: {entry_price} USDC)")
            
            # Calculate target and stop-loss prices
            target_price = entry_price * (1 + (self.config.target_profit / 100))
            stop_loss_price = entry_price * (1 - (self.config.stop_loss / 100))
            
            logger.info(f"Target price: {target_price} USDC (+{self.config.target_profit}%)")
            logger.info(f"Stop-loss price: {stop_loss_price} USDC (-{self.config.stop_loss}%)")
            
            # Calculate max holding time
            entry_time = trade_info["entry_time"]
            max_hold_time = entry_time + timedelta(minutes=self.config.max_holding_time)
            
            prev_price = entry_price
            volatility_triggered = False
            
            while token_address in self.active_trades and self.running:
                try:
                    # Check current price
                    current_price = await check_token_price(
                        token_address,
                        self.config.usdc_address,
                        1.0  # Just checking the price of 1 token
                    )
                    
                    if current_price <= 0:
                        logger.warning(f"Failed to get valid price for {token_name}, will retry")
                        await asyncio.sleep(self.config.price_check_interval)
                        continue
                    
                    price_change_pct = ((current_price - entry_price) / entry_price) * 100
                    logger.info(f"{token_name} current price: {current_price} USDC ({price_change_pct:.2f}%)")
                    
                    # Check for volatility spike if enabled
                    if self.config.sell_on_volatility_spike:
                        price_change_since_last = abs((current_price - prev_price) / prev_price) * 100
                        if price_change_since_last > 10:  # 10% rapid change
                            volatility_triggered = True
                            logger.warning(f"Volatility spike detected for {token_name}: {price_change_since_last:.2f}%")
                    
                    # Save current price for next comparison
                    prev_price = current_price
                    
                    # Check if we should sell
                    if current_price >= target_price:
                        logger.info(f"🎯 Target price reached for {token_name}! Selling...")
                        await self.sell_token(token_address, trade_info, "target")
                        break
                        
                    if current_price <= stop_loss_price:
                        logger.warning(f"⚠️ Stop-loss triggered for {token_name}! Selling...")
                        await self.sell_token(token_address, trade_info, "stop_loss")
                        break
                    
                    # Check max holding time
                    if datetime.now() > max_hold_time:
                        logger.warning(f"⏰ Max holding time reached for {token_name}! Selling...")
                        await self.sell_token(token_address, trade_info, "max_time")
                        break
                    
                    # Check volatility trigger
                    if volatility_triggered:
                        logger.warning(f"📈 Volatility spike triggered for {token_name}! Selling...")
                        await self.sell_token(token_address, trade_info, "volatility")
                        break
                        
                    # Wait before checking again
                    await asyncio.sleep(self.config.price_check_interval)
                    
                except Exception as e:
                    logger.error(f"Error monitoring price for {token_address}: {e}")
                    await asyncio.sleep(self.config.price_check_interval)
                    
        except Exception as e:
            logger.error(f"Fatal error in price monitoring for {token_address}: {e}")
            
    async def sell_token(
        self, 
        token_address: str, 
        trade_info: Dict[str, Any], 
        sell_reason: str
    ):
        """Sell a token."""
        try:
            token_name = trade_info.get("token_name", "Unknown")
            
            # We need to determine how many tokens we have
            # In a real implementation, you'd query the token account balance
            
            # For demonstration, we'll estimate based on entry price and USDC spent
            estimated_token_amount = trade_info["amount_usdc_spent"] / trade_info["entry_price"]
            
            logger.info(f"Selling approximately {estimated_token_amount} {token_name} tokens...")
            
            # Simulate sell to check for issues
            simulation_success, quote = await simulate_jupiter_swap(
                self.client,
                self.keypair,
                token_address,
                self.config.usdc_address,
                estimated_token_amount,
                self.config.slippage
            )
            
            if not simulation_success or not quote:
                logger.warning(f"Sell simulation failed for {token_name}, will retry later")
                return
                
            # Execute the sell
            tx_sig = await execute_jupiter_swap(
                self.client, 
                self.keypair, 
                quote,
                priority_fee=self.config.max_priority_fee
            )
            
            if not tx_sig:
                logger.error(f"Sell execution failed for {token_name}")
                return
                
            # Calculate profit/loss
            exit_price = await check_token_price(
                token_address,
                self.config.usdc_address,
                1.0
            )
            
            entry_price = trade_info["entry_price"]
            price_change_pct = ((exit_price - entry_price) / entry_price) * 100
            
            profit_loss_status = "profit" if price_change_pct > 0 else "loss"
            logger.info(f"Sold {token_name} with {profit_loss_status} of {price_change_pct:.2f}%")
            logger.info(f"Sell transaction: {tx_sig}")
            
            # Remove from active trades
            del self.active_trades[token_address]
            
        except Exception as e:
            logger.error(f"Error selling {token_address}: {e}")
    
    async def check_token_liquidity(self, token_address: str) -> float:
        """Check token's liquidity in USDC."""
        # This is a placeholder - in a real implementation, you'd query the DEX for actual liquidity
        # For example, checking the token-USDC pool on Raydium or Jupiter
        try:
            # Get quotes for a large swap to estimate liquidity
            _, quote = await get_jupiter_quote(
                self.client,
                self.config.usdc_address,
                token_address,
                100000,  # 100k USDC to check depth
                self.config.slippage
            )
            
            if quote and "inAmount" in quote and "outAmount" in quote:
                # Rough estimation of liquidity
                return float(quote["inAmount"]) / 1000000  # Convert from USDC decimals
            return 0
        except Exception as e:
            logger.error(f"Error checking liquidity for {token_address}: {e}")
            return 0
    
    async def check_antibot_protection(self, token_address: str) -> bool:
        """Check if token has anti-bot protection."""
        # This is a placeholder - in a real implementation, you'd analyze the token contract
        # For example, checking for transfer limits, blacklists, etc.
        return False  # For demo purposes
    
    async def get_wallet_usdc_balance(self) -> float:
        """Get the USDC balance of the wallet."""
        # This is a placeholder - in a real implementation, you'd query the wallet's USDC balance
        return 100.0  # Example balance of 100 USDC
        
    async def start(self):
        """Start the token trader."""
        self.running = True
        logger.info("Token trader started")
        
    async def stop(self):
        """Stop the token trader."""
        self.running = False
        # Attempt to sell all active positions
        for token_address, trade_info in list(self.active_trades.items()):
            logger.info(f"Closing position for {trade_info.get('token_name', 'Unknown')} due to bot shutdown")
            await self.sell_token(token_address, trade_info, "shutdown")
        logger.info("Token trader stopped")
