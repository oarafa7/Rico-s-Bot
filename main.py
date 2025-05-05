
import asyncio
import signal
import sys
import threading
from typing import Dict, Any, Set
from loguru import logger

# Import our modules
from config import load_config, BotConfig
from scanner import TokenScanner
from trader import TokenTrader
from telegram_alerts import TelegramAlerts
from api_server import start_api_server

class TokenSnipingBot:
    def __init__(self):
        """Initialize the token sniping bot."""
        self.config = None
        self.scanner = None
        self.trader = None
        self.telegram = None
        self.running = False
        
    async def initialize(self):
        """Initialize all components."""
        # Load configuration
        self.config = load_config()
        
        # Initialize components
        self.scanner = TokenScanner(self.config)
        self.trader = TokenTrader(self.config)
        self.telegram = TelegramAlerts(
            self.config.telegram_bot_token, 
            self.config.telegram_chat_id
        )
        
        # Initialize each component
        await self.scanner.initialize()
        await self.trader.initialize()
        await self.telegram.initialize()
        
        # Set up callback from scanner to trader
        self.scanner.set_token_listed_callback(self.on_token_listed)
        
        logger.info("Token Sniping Bot initialization complete")
        
    async def on_token_listed(self, token_address: str, token_metadata: Dict[str, Any]):
        """Handle a newly listed token."""
        # Send alert
        token_name = token_metadata.get("name", "Unknown")
        await self.telegram.send_message(
            f"🚨 NEW TOKEN LISTED 🚨\n\n"
            f"Token: {token_name}\n"
            f"Address: {token_address}\n\n"
            f"Analyzing for potential trade..."
        )
        
        # Hand off to trader for analysis and potential trade
        await self.trader.handle_new_token(token_address, token_metadata)
        
    async def start(self):
        """Start the bot."""
        self.running = True
        
        # Start components
        await self.scanner.start()
        await self.trader.start()
        
        logger.info("Token Sniping Bot started. Monitoring for new tokens...")
        
        # Send startup notification
        await self.telegram.send_message(
            "🚀 Solana Token Sniping Bot started\n\n"
            f"Monitoring for new tokens with:\n"
            f"• Target Profit: {self.config.target_profit}%\n"
            f"• Stop Loss: {self.config.stop_loss}%\n"
            f"• Swap Amount: {self.config.swap_amount_usdc} USDC\n"
            f"• Min Liquidity: {self.config.minimum_liquidity} USDC\n"
        )
        
        # Keep running until stopped
        while self.running:
            await asyncio.sleep(1)
            
    async def stop(self):
        """Stop the bot."""
        logger.info("Stopping Token Sniping Bot...")
        self.running = False
        
        # Stop components in reverse order
        await self.trader.stop()
        await self.scanner.stop()
        
        # Send shutdown notification
        await self.telegram.send_message("⚠️ Solana Token Sniping Bot has been stopped")
        
        logger.info("Token Sniping Bot stopped")
        
    def setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        def signal_handler(sig, frame):
            logger.info(f"Received signal {sig}, shutting down...")
            asyncio.create_task(self.stop())
            
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)


async def main():
    """Main entry point for the bot."""
    # Set up the bot
    bot = TokenSnipingBot()
    
    try:
        # Initialize components
        await bot.initialize()
        
        # Set up signal handlers
        bot.setup_signal_handlers()
        
        # Start the bot
        await bot.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        # Ensure the bot is stopped properly
        await bot.stop()

if __name__ == "__main__":
    # Start the API server in a separate thread
    api_thread = threading.Thread(target=start_api_server, daemon=True)
    api_thread.start()
    
    # Run the async main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        sys.exit(1)
