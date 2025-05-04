
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
from loguru import logger
import json
from solders.pubkey import Pubkey

# Load environment variables
load_dotenv()

class BotConfig(BaseModel):
    # RPC and wallet configuration
    rpc_url: str
    wallet_address: str
    private_key: str
    
    # Trading parameters
    slippage: float  # in percentage (e.g., 1.0 = 1%)
    target_profit: float  # in percentage (e.g., 20.0 = 20%)
    stop_loss: float  # in percentage (e.g., 10.0 = 10%)
    
    # Amount to swap in USDC (default: 10 USDC)
    swap_amount_usdc: float = 10.0
    
    # USDC token address on Solana
    usdc_address: str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    
    # Known DEX program IDs
    raydium_amm_program_id: str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
    jupiter_program_id: str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
    
    # Timeouts and intervals (in seconds)
    scan_interval: float = 1.0
    price_check_interval: float = 5.0
    connection_timeout: float = 30.0
    
    # Telegram configuration (optional)
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
    # Performance optimization
    max_concurrent_requests: int = 5
    max_retries: int = 3
    retry_delay: float = 1.0
    
    # Optional whitelist/blacklist for tokens
    token_whitelist: list = []
    token_blacklist: list = []
    
    def __init__(self, **data):
        super().__init__(**data)
        # Convert string addresses to Pubkey objects
        self.usdc_pubkey = Pubkey.from_string(self.usdc_address)
        self.raydium_amm_program_pubkey = Pubkey.from_string(self.raydium_amm_program_id)
        self.jupiter_program_pubkey = Pubkey.from_string(self.jupiter_program_id)

def load_config() -> BotConfig:
    """Load configuration from environment variables."""
    try:
        config = BotConfig(
            rpc_url=os.getenv("RPC_URL"),
            wallet_address=os.getenv("WALLET_ADDRESS"),
            private_key=os.getenv("PRIVATE_KEY"),
            slippage=float(os.getenv("SLIPPAGE", "1.0")),
            target_profit=float(os.getenv("TARGET_PROFIT", "20.0")),
            stop_loss=float(os.getenv("STOP_LOSS", "10.0")),
            swap_amount_usdc=float(os.getenv("SWAP_AMOUNT_USDC", "10.0")),
            telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN"),
            telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID"),
            scan_interval=float(os.getenv("SCAN_INTERVAL", "1.0")),
            price_check_interval=float(os.getenv("PRICE_CHECK_INTERVAL", "5.0")),
        )
        
        # Load optional whitelist/blacklist from environment
        whitelist = os.getenv("TOKEN_WHITELIST")
        if whitelist:
            config.token_whitelist = whitelist.split(",")
        
        blacklist = os.getenv("TOKEN_BLACKLIST")
        if blacklist:
            config.token_blacklist = blacklist.split(",")
            
        logger.info("Configuration loaded successfully")
        return config
    except Exception as e:
        logger.error(f"Error loading configuration: {str(e)}")
        raise
