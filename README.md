
# Solana Token Sniping Bot

A high-performance Python bot for detecting and trading newly listed tokens on Solana DEXes.

## Features

- **Real-time Token Detection**: Monitor Raydium liquidity pool creation events in real-time
- **Automatic Trading**: Buy newly listed tokens that pass safety checks
- **Price Monitoring**: Track price changes and automatically sell at target profit or stop-loss
- **Honeypot Detection**: Simulate swaps before buying to detect honeypots and scam tokens
- **Telegram Alerts**: Receive instant notifications on new token listings and trades
- **Secure Configuration**: Store sensitive data in .env file for security

## Requirements

- Python 3.9+
- Solana wallet with private key
- Fast RPC endpoint (Quicknode, Alchemy, etc.)
- USDC tokens for trading

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/solana-token-sniper.git
   cd solana-token-sniper
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory:
   ```
   RPC_URL=YOUR_RPC_URL
   WALLET_ADDRESS=YOUR_WALLET_ADDRESS
   PRIVATE_KEY=YOUR_PRIVATE_KEY
   SLIPPAGE=1.0
   TARGET_PROFIT=20.0
   STOP_LOSS=10.0
   SWAP_AMOUNT_USDC=10.0
   TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN  # Optional
   TELEGRAM_CHAT_ID=YOUR_CHAT_ID  # Optional
   ```

## Usage

Start the bot:
```bash
python main.py
```

The bot will:
1. Connect to the Solana network
2. Start monitoring for new token listings on Raydium
3. Analyze new tokens for potential trades
4. Execute buys for promising tokens
5. Monitor prices and sell when targets are hit

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | URL of your Solana RPC provider | - |
| `WALLET_ADDRESS` | Your Solana wallet address | - |
| `PRIVATE_KEY` | Base58 encoded private key | - |
| `SLIPPAGE` | Maximum slippage tolerance in % | 1.0 |
| `TARGET_PROFIT` | Target profit percentage | 20.0 |
| `STOP_LOSS` | Stop loss percentage | 10.0 |
| `SWAP_AMOUNT_USDC` | Amount of USDC to swap | 10.0 |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts | - |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for alerts | - |
| `TOKEN_WHITELIST` | Comma-separated list of allowed tokens | - |
| `TOKEN_BLACKLIST` | Comma-separated list of blocked tokens | - |
| `SCAN_INTERVAL` | Interval between scans in seconds | 1.0 |
| `PRICE_CHECK_INTERVAL` | Interval between price checks in seconds | 5.0 |

## Architecture

The bot is structured into several key components:

1. **Scanner (`scanner.py`)**: Monitors the Solana blockchain for new token listings
2. **Trader (`trader.py`)**: Analyzes tokens and executes trades
3. **Config (`config.py`)**: Handles configuration management
4. **Utils (`utils.py`)**: Contains utility functions for interacting with Solana and Jupiter
5. **Telegram Alerts (`telegram_alerts.py`)**: Sends notifications to Telegram
6. **Main (`main.py`)**: Coordinates all components and provides the entry point

## Optimization Tips

For best performance:

1. **Use a fast RPC endpoint** - Consider premium RPC providers for lower latency
2. **Run on a VPS close to Solana validators** - Geographic proximity matters
3. **Tune the `SCAN_INTERVAL` and `PRICE_CHECK_INTERVAL`** - Lower values for faster reactions
4. **Increase `SLIPPAGE` during high volatility** - Prevents failed transactions
5. **Refine whitelist/blacklist** - Focus on specific token types

## Disclaimer

This bot is provided for educational purposes only. Trading cryptocurrencies involves significant risk, and you could lose your investment. Always do your own research and use this bot at your own risk.

## License

MIT
