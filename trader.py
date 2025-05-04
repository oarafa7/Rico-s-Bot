
import asyncio
import time
from typing import Dict, Any, List, Optional
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from loguru import logger

from config import BotConfig
from utils import (
    create_solana_client, 
    load_keypair, 
    get_jupiter_quote, 
    simulate_jupiter_swap,
    execute_jupiter_swap,
    check_token_price,
    is_honeypot
)

class TokenTrader:
    def __init__(self, config: BotConfig):
        """Initialize the token trader."""
        self.config = config
        self.client = None
        self.keypair = None
        self.active_trades: Dict[str, Dict[str, Any]] = {}
        self.running = False
        
    async def initialize(self):
        """Initialize the trader."""
        self.client = await create_solana_client(self.config.rpc_url)
        self.keypair = load_keypair(self.config.private_key)
        logger.info(f"Token trader initialized for wallet: {self.keypair.pubkey()}")
        
    async def handle_new_token(self, token_address: str, token_metadata: Dict[str, Any]):
        """Handle a newly listed token."""
        try:
            logger.info(f"Evaluating new token: {token_metadata.get('name', 'Unknown')} ({token_address})")
            
            # Safety delay to allow the pool to stabilize
            await asyncio.sleep(1)
            
            # Check if we're already trading this token
            if token_address in self.active_trades:
                logger.warning(f"Already trading {token_address}, skipping")
                return
                
            # Simulate a swap to check for issues/honeypots
            simulation_success, quote = await simulate_jupiter_swap(
                self.client,
                self.keypair,
                self.config.usdc_address,
                token_address,
                self.config.swap_amount_usdc,
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
            logger.info(f"Executing swap for {self.config.swap_amount_usdc} USDC -> {token_metadata.get('name', 'Unknown')}")
            tx_sig = await execute_jupiter_swap(self.client, self.keypair, quote)
            
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
                "amount_usdc_spent": self.config.swap_amount_usdc,
                "tx_sig": tx_sig,
                "timestamp": time.time(),
            }
            
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
                    
                    # Check if we should sell
                    if current_price >= target_price:
                        logger.info(f"🎯 Target price reached for {token_name}! Selling...")
                        await self.sell_token(token_address, trade_info, "target")
                        break
                        
                    if current_price <= stop_loss_price:
                        logger.warning(f"⚠️ Stop-loss triggered for {token_name}! Selling...")
                        await self.sell_token(token_address, trade_info, "stop_loss")
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
            tx_sig = await execute_jupiter_swap(self.client, self.keypair, quote)
            
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
