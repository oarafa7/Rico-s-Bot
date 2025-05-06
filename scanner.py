import asyncio
import time
import json
from typing import Dict, Any, List, Set, Callable, Coroutine
import websockets
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from solana.transaction import Transaction
from loguru import logger

from config import BotConfig
from utils import create_solana_client, get_token_metadata

class TokenScanner:
    def __init__(self, config: BotConfig):
        """Initialize the token scanner."""
        self.config = config
        self.client = None
        self.recent_blocks: Set[int] = set()
        self.known_pools: Set[str] = set()
        self.running = False
        self.on_token_listed_callback = None
        self.ws_connection = None
        
    async def initialize(self):
        """Initialize the scanner."""
        self.client = await create_solana_client(self.config.rpc_url)
        logger.info("Token scanner initialized")
        
    async def subscribe_transaction_updates(self):
        """Subscribe to transaction updates using websocket."""
        subscription_id = "raydium_pool_monitor"
        ws_url = self.config.rpc_url.replace("https://", "wss://").replace("http://", "ws://")
        
        # Parameters for transaction subscription
        # We're specifically looking for Raydium AMM program transactions
        params = [
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "transactionSubscribe",
                "params": [
                    {
                        "accountIds": [str(self.config.raydium_amm_program_pubkey)],
                        "encoding": "jsonParsed",
                    },
                    {
                        "commitment": "confirmed",
                        "encoding": "jsonParsed",
                    }
                ]
            }
        ]
        
        try:
            async with websockets.connect(ws_url) as websocket:
                self.ws_connection = websocket
                logger.info("Connected to Solana transaction websocket")
                
                # Send subscription request
                await websocket.send(json.dumps(params[0]))
                
                # Process incoming messages
                while self.running:
                    try:
                        msg = await websocket.recv()
                        await self.process_transaction_update(json.loads(msg))
                    except websockets.ConnectionClosed:
                        logger.warning("Websocket connection closed, attempting to reconnect...")
                        break
                    except Exception as e:
                        logger.error(f"Error processing transaction: {e}")
                        
        except Exception as e:
            logger.error(f"Error in websocket connection: {e}")
            # Wait before retrying
            await asyncio.sleep(5)
            if self.running:
                # Retry connection
                asyncio.create_task(self.subscribe_transaction_updates())
                
    async def process_transaction_update(self, transaction_data: Dict[str, Any]):
        """Process transaction updates from websocket."""
        try:
            # Check if this is a subscription message
            if "params" not in transaction_data:
                return
                
            # Extract transaction data
            tx_data = transaction_data.get("params", {}).get("result", {})
            if not tx_data:
                return
                
            # Check if this is related to pool creation
            await self._process_potential_pool_creation(tx_data)
                
        except Exception as e:
            logger.error(f"Error processing transaction update: {e}")
    
    async def _process_potential_pool_creation(self, tx_data: Dict[str, Any]):
        """Process a transaction that might be creating a liquidity pool."""
        try:
            # Extract signature to avoid duplicates
            signature = tx_data.get("signature")
            if not signature or signature in self.known_pools:
                return
                
            # Check if transaction was successful
            meta = tx_data.get("meta")
            if not meta or meta.get("err") is not None:
                return
                
            # Look for accounts that might be liquidity pools
            # In a real implementation, you'd look for specific patterns in the 
            # transaction that indicate a new pool was created
            
            # For demonstration, we'll check logs for pool creation patterns
            logs = meta.get("logMessages", [])
            
            # Check if this transaction created a Raydium pool
            if any("Initialize AMM" in log for log in logs):
                # Extract token A and token B from the logs
                # This is a simplified approach
                token_a = None
                token_b = None
                
                for log in logs:
                    if "Token A" in log:
                        # Extract token A address from log (implementation depends on log format)
                        # This is a placeholder
                        pass
                        
                    if "Token B" in log:
                        # Extract token B address from log (implementation depends on log format)
                        # This is a placeholder
                        pass
                
                # If we found both tokens
                if token_a and token_b:
                    # If token_a or token_b is USDC, we found a USDC pair
                    if token_a == str(self.config.usdc_pubkey):
                        new_token = token_b
                    elif token_b == str(self.config.usdc_pubkey):
                        new_token = token_a
                    else:
                        # Not a USDC pair, skip
                        return
                        
                    # Add to known pools to avoid duplicates
                    self.known_pools.add(signature)
                    
                    # Log new pool detection
                    logger.info(f"New token pool detected: {new_token}")
                    
                    # Get token metadata
                    token_pubkey = Pubkey.from_string(new_token)
                    token_metadata = await get_token_metadata(self.client, token_pubkey)
                    
                    # Check whitelist/blacklist
                    if (self.config.token_whitelist and 
                        new_token not in self.config.token_whitelist):
                        logger.info(f"Token {new_token} not in whitelist, skipping")
                        return
                        
                    if new_token in self.config.token_blacklist:
                        logger.info(f"Token {new_token} in blacklist, skipping")
                        return
                    
                    # Call callback if set
                    if self.on_token_listed_callback:
                        logger.info(f"Notifying trader about new token: {token_metadata.get('name', 'Unknown')}")
                        await self.on_token_listed_callback(new_token, token_metadata)
                        
        except Exception as e:
            logger.error(f"Error processing potential pool creation: {e}")
            
    def set_token_listed_callback(self, callback: Callable[[str, Dict[str, Any]], Coroutine]):
        """Set callback for when a new token is listed."""
        self.on_token_listed_callback = callback
            
    async def start(self):
        """Start the token scanner."""
        self.running = True
        
        # Start websocket subscription for transaction updates
        asyncio.create_task(self.subscribe_transaction_updates())
        
        logger.info("Token scanner started")
        
    async def stop(self):
        """Stop the token scanner."""
        self.running = False
        if self.ws_connection:
            await self.ws_connection.close()
        logger.info("Token scanner stopped")
