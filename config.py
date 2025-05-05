
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, List
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
    
    # Buy Conditions
    minimum_liquidity: float = 1000.0  # in USDC
    slippage: float = 1.0  # in percentage
    allowed_dexes: List[str] = ["jupiter", "raydium"]
    require_verified_contract: bool = True
    max_priority_fee: float = 0.000005  # in SOL
    enable_antibot: bool = True
    
    # Sell Conditions
    target_profit: float = 20.0  # in percentage
    stop_loss: float = 10.0  # in percentage
    max_holding_time: int = 60  # in minutes
    sell_on_volatility_spike: bool = False
    
    # Risk Control
    position_size_percentage: float = 5.0  # % of total balance
    max_open_trades: int = 3
    cooldown_period: int = 30  # in seconds
    
    # Trading Parameters
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

def load_config(config_path: str = "bot_config.json") -> BotConfig:
    """Load configuration from environment variables or config file."""
    try:
        # First check if a config file exists
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config_data = json.load(f)
                # Override with env vars if they exist
                for key in config_data:
                    env_value = os.getenv(key.upper())
                    if env_value is not None:
                        if isinstance(config_data[key], bool):
                            config_data[key] = env_value.lower() == 'true'
                        elif isinstance(config_data[key], (int, float)):
                            config_data[key] = type(config_data[key])(env_value)
                        else:
                            config_data[key] = env_value
                
                config = BotConfig(**config_data)
                logger.info("Configuration loaded from file and environment")
                return config
        
        # If no config file, use environment variables
        config = BotConfig(
            rpc_url=os.getenv("RPC_URL"),
            wallet_address=os.getenv("WALLET_ADDRESS"),
            private_key=os.getenv("PRIVATE_KEY"),
            slippage=float(os.getenv("SLIPPAGE", "1.0")),
            target_profit=float(os.getenv("TARGET_PROFIT", "20.0")),
            stop_loss=float(os.getenv("STOP_LOSS", "10.0")),
            swap_amount_usdc=float(os.getenv("SWAP_AMOUNT_USDC", "10.0")),
            minimum_liquidity=float(os.getenv("MINIMUM_LIQUIDITY", "1000.0")),
            require_verified_contract=os.getenv("REQUIRE_VERIFIED_CONTRACT", "true").lower() == "true",
            max_priority_fee=float(os.getenv("MAX_PRIORITY_FEE", "0.000005")),
            enable_antibot=os.getenv("ENABLE_ANTIBOT", "true").lower() == "true",
            max_holding_time=int(os.getenv("MAX_HOLDING_TIME", "60")),
            sell_on_volatility_spike=os.getenv("SELL_ON_VOLATILITY_SPIKE", "false").lower() == "true",
            position_size_percentage=float(os.getenv("POSITION_SIZE_PERCENTAGE", "5.0")),
            max_open_trades=int(os.getenv("MAX_OPEN_TRADES", "3")),
            cooldown_period=int(os.getenv("COOLDOWN_PERIOD", "30")),
            telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN"),
            telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID"),
            scan_interval=float(os.getenv("SCAN_INTERVAL", "1.0")),
            price_check_interval=float(os.getenv("PRICE_CHECK_INTERVAL", "5.0")),
        )
        
        # Save initial config to file
        save_config(config, config_path)
        
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

def save_config(config: BotConfig, config_path: str = "bot_config.json") -> bool:
    """Save configuration to a file."""
    try:
        # Convert to dict and remove computed properties
        config_dict = config.dict()
        keys_to_remove = ["usdc_pubkey", "raydium_amm_program_pubkey", "jupiter_program_pubkey"]
        for key in keys_to_remove:
            if key in config_dict:
                del config_dict[key]
        
        # Save to file
        with open(config_path, 'w') as f:
            json.dump(config_dict, f, indent=2)
        logger.info(f"Configuration saved to {config_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving configuration: {str(e)}")
        return False
