
import asyncio
import json
import os
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uvicorn
import threading
from loguru import logger

from config import BotConfig, load_config, save_config

app = FastAPI(title="Solana Token Sniping Bot API")

# Add CORS middleware to allow cross-origin requests from the dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your dashboard URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
bot_instance = None
bot_status = "stopped"
config_path = "bot_config.json"

# Dependency to get the current config
def get_config():
    return load_config(config_path)

# Models for request validation
class BuyConditionsUpdate(BaseModel):
    minimum_liquidity: Optional[float] = None
    slippage: Optional[float] = None
    allowed_dexes: Optional[List[str]] = None
    require_verified_contract: Optional[bool] = None
    max_priority_fee: Optional[float] = None
    enable_antibot: Optional[bool] = None

class SellConditionsUpdate(BaseModel):
    target_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    max_holding_time: Optional[int] = None
    sell_on_volatility_spike: Optional[bool] = None

class RiskControlUpdate(BaseModel):
    position_size_percentage: Optional[float] = None
    max_open_trades: Optional[int] = None
    cooldown_period: Optional[int] = None

class ConfigUpdate(BaseModel):
    buy_conditions: Optional[BuyConditionsUpdate] = None
    sell_conditions: Optional[SellConditionsUpdate] = None
    risk_control: Optional[RiskControlUpdate] = None
    rpc_url: Optional[str] = None
    wallet_address: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    telegram_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

# Routes
@app.get("/")
async def root():
    return {"message": "Solana Token Sniping Bot API"}

@app.get("/status")
async def get_status():
    global bot_status
    return {"status": bot_status}

@app.get("/config")
async def get_config_endpoint(config: BotConfig = Depends(get_config)):
    """Get the current bot configuration"""
    config_dict = config.dict()
    # Remove sensitive information
    if "private_key" in config_dict:
        config_dict["private_key"] = "********"
    
    # Organize config into categories
    result = {
        "buy_conditions": {
            "minimum_liquidity": config.minimum_liquidity,
            "slippage": config.slippage,
            "allowed_dexes": config.allowed_dexes,
            "require_verified_contract": config.require_verified_contract,
            "max_priority_fee": config.max_priority_fee,
            "enable_antibot": config.enable_antibot,
        },
        "sell_conditions": {
            "target_profit": config.target_profit,
            "stop_loss": config.stop_loss,
            "max_holding_time": config.max_holding_time,
            "sell_on_volatility_spike": config.sell_on_volatility_spike,
        },
        "risk_control": {
            "position_size_percentage": config.position_size_percentage,
            "max_open_trades": config.max_open_trades,
            "cooldown_period": config.cooldown_period,
        },
        "general": {
            "rpc_url": config.rpc_url,
            "wallet_address": config.wallet_address,
            "telegram_enabled": bool(config.telegram_bot_token and config.telegram_chat_id),
            "telegram_token": "********" if config.telegram_bot_token else None,
            "telegram_chat_id": config.telegram_chat_id,
        }
    }
    
    return result

@app.post("/config")
async def update_config(
    config_update: ConfigUpdate, 
    background_tasks: BackgroundTasks,
    config: BotConfig = Depends(get_config)
):
    """Update the bot configuration"""
    try:
        config_dict = config.dict()
        
        # Update buy conditions
        if config_update.buy_conditions:
            buy_update = config_update.buy_conditions.dict(exclude_unset=True)
            for key, value in buy_update.items():
                config_dict[key] = value
                
        # Update sell conditions
        if config_update.sell_conditions:
            sell_update = config_update.sell_conditions.dict(exclude_unset=True)
            for key, value in sell_update.items():
                config_dict[key] = value
                
        # Update risk control
        if config_update.risk_control:
            risk_update = config_update.risk_control.dict(exclude_unset=True)
            for key, value in risk_update.items():
                config_dict[key] = value
                
        # Update general settings
        if config_update.rpc_url is not None:
            config_dict["rpc_url"] = config_update.rpc_url
        if config_update.wallet_address is not None:
            config_dict["wallet_address"] = config_update.wallet_address
        if config_update.telegram_token is not None:
            config_dict["telegram_bot_token"] = config_update.telegram_token
        if config_update.telegram_chat_id is not None:
            config_dict["telegram_chat_id"] = config_update.telegram_chat_id
            
        # Create updated config
        updated_config = BotConfig(**config_dict)
        
        # Save to file
        success = save_config(updated_config, config_path)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save configuration")
            
        # Apply changes to the running bot in the background
        if bot_instance is not None and bot_status == "running":
            background_tasks.add_task(apply_config_to_bot, updated_config)
            
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start")
async def start_bot(background_tasks: BackgroundTasks):
    """Start the bot"""
    global bot_status
    
    if bot_status == "running":
        return {"message": "Bot is already running"}
        
    bot_status = "starting"
    # Start the bot in the background
    background_tasks.add_task(start_bot_task)
    return {"message": "Bot is starting"}

@app.post("/stop")
async def stop_bot(background_tasks: BackgroundTasks):
    """Stop the bot"""
    global bot_status
    
    if bot_status == "stopped":
        return {"message": "Bot is already stopped"}
        
    bot_status = "stopping"
    # Stop the bot in the background
    background_tasks.add_task(stop_bot_task)
    return {"message": "Bot is stopping"}

@app.get("/trades")
async def get_trades():
    """Get current active trades"""
    global bot_instance
    
    if bot_instance is None or bot_status != "running":
        return {"trades": []}
        
    trades = []
    for token_address, trade_info in bot_instance.trader.active_trades.items():
        # Format the trade info for display
        trades.append({
            "token_address": token_address,
            "token_name": trade_info.get("token_name", "Unknown"),
            "token_symbol": trade_info.get("token_symbol", "UNKNOWN"),
            "entry_price": trade_info.get("entry_price", 0),
            "amount_spent": trade_info.get("amount_usdc_spent", 0),
            "timestamp": trade_info.get("timestamp", 0),
        })
        
    return {"trades": trades}

# Background tasks
async def start_bot_task():
    """Task to start the bot"""
    global bot_instance, bot_status
    
    try:
        from main import TokenSnipingBot
        
        # Initialize the bot
        bot_instance = TokenSnipingBot()
        await bot_instance.initialize()
        
        # Start the bot
        await bot_instance.start()
        bot_status = "running"
        logger.info("Bot started successfully")
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")
        bot_status = "error"

async def stop_bot_task():
    """Task to stop the bot"""
    global bot_instance, bot_status
    
    try:
        if bot_instance is not None:
            await bot_instance.stop()
            bot_instance = None
            
        bot_status = "stopped"
        logger.info("Bot stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop bot: {e}")
        bot_status = "error"

async def apply_config_to_bot(new_config: BotConfig):
    """Apply new configuration to the running bot"""
    global bot_instance
    
    try:
        if bot_instance is not None and hasattr(bot_instance, 'config'):
            # Update the configuration
            bot_instance.config = new_config
            
            # Update configuration in components
            if hasattr(bot_instance, 'trader') and bot_instance.trader is not None:
                bot_instance.trader.config = new_config
                
            if hasattr(bot_instance, 'scanner') and bot_instance.scanner is not None:
                bot_instance.scanner.config = new_config
                
            logger.info("Configuration applied to running bot")
    except Exception as e:
        logger.error(f"Failed to apply configuration: {e}")

# Function to start the API server
def start_api_server():
    """Start the FastAPI server"""
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Start the API server in a separate thread when imported
if __name__ == "__main__":
    start_api_server()
