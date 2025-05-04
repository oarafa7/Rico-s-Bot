
import asyncio
from typing import Optional, Dict, Any
import telegram
from telegram.ext import Application
from loguru import logger

class TelegramAlerts:
    def __init__(self, bot_token: Optional[str], chat_id: Optional[str]):
        """Initialize Telegram alerts."""
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.bot = None
        self.initialized = False
        
    async def initialize(self):
        """Initialize the Telegram bot."""
        if not self.bot_token or not self.chat_id:
            logger.info("Telegram alerts disabled (no token or chat ID provided)")
            return
            
        try:
            self.bot = Application.builder().token(self.bot_token).build()
            self.initialized = True
            logger.info("Telegram alerts initialized")
        except Exception as e:
            logger.error(f"Error initializing Telegram alerts: {e}")
            
    async def send_message(self, message: str):
        """Send a message via Telegram."""
        if not self.initialized or not self.bot:
            return
            
        try:
            await self.bot.bot.send_message(chat_id=self.chat_id, text=message)
            logger.debug(f"Telegram alert sent: {message}")
        except Exception as e:
            logger.error(f"Error sending Telegram alert: {e}")
            
    async def send_trade_alert(
        self, 
        action: str, 
        token_name: str, 
        token_address: str, 
        price: float, 
        tx_sig: Optional[str] = None,
        profit_pct: Optional[float] = None
    ):
        """Send an alert about a trade."""
        if not self.initialized:
            return
            
        if action.lower() == "buy":
            emoji = "🔥"
            message = f"{emoji} NEW PURCHASE {emoji}\n\n"
            message += f"Token: {token_name}\n"
            message += f"Address: {token_address}\n"
            message += f"Price: {price} USDC\n"
            if tx_sig:
                message += f"\nTx: https://explorer.solana.com/tx/{tx_sig}"
                
        elif action.lower() == "sell":
            emoji = "💰" if profit_pct and profit_pct > 0 else "⚠️"
            message = f"{emoji} TOKEN SOLD {emoji}\n\n"
            message += f"Token: {token_name}\n"
            message += f"Address: {token_address}\n"
            message += f"Exit Price: {price} USDC\n"
            
            if profit_pct is not None:
                message += f"Profit/Loss: {profit_pct:.2f}%\n"
                
            if tx_sig:
                message += f"\nTx: https://explorer.solana.com/tx/{tx_sig}"
        else:
            message = f"Alert: {action} for {token_name}"
            
        await self.send_message(message)
        
    async def send_error_alert(self, error_message: str):
        """Send an alert about an error."""
        if not self.initialized:
            return
            
        message = f"⚠️ ERROR ⚠️\n\n{error_message}"
        await self.send_message(message)
