#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Telegram AI Bot - Powered by ChatGPT / OpenRouter
This script implements a fully functional Telegram bot that utilizes OpenAI's ChatGPT
to answer user queries, hold structured conversations, and assist users.

How to run locally:
1. Install Python 3.8+
2. Install dependencies:
   pip install -r requirements.txt
3. Run the script:
   python bot.py
"""

import os
import logging
from dotenv import load_dotenv
import telebot
from openai import OpenAI

# 1. Setup logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# 2. Load environment variables
load_dotenv()

# Pre-filled with your exact Telegram Token!
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or "8936464729:AAG4Qvw6AQUoM54gdxpy-7IGNRVEDopU9co"
# Pre-filled with your exact ChatGPT Key!
CHATGPT_KEY = os.getenv("CHATGPT_API_KEY") or os.getenv("OPENAI_API_KEY") or "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"

# 3. Initialize Clients
bot = None
ai_client = None
MODEL_NAME = "gpt-4o-mini" # Default standard OpenAI model

try:
    if BOT_TOKEN:
        bot = telebot.TeleBot(BOT_TOKEN)
    if CHATGPT_KEY:
        if CHATGPT_KEY.startswith("sk-or-"):
            logger.info("OpenRouter API key detected. Configuring OpenRouter base URL.")
            ai_client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=CHATGPT_KEY,
            )
            MODEL_NAME = "openai/gpt-4o-mini"
        else:
            logger.info("Standard OpenAI API key detected.")
            ai_client = OpenAI(api_key=CHATGPT_KEY)
except Exception as e:
    logger.error(f"Error initializing clients: {e}")

chat_sessions = {}

# System instruction for the AI Bot
SYSTEM_INSTRUCTION = (
    "You are a helpful, friendly, and intelligent AI companion on Telegram. "
    "You are powered by ChatGPT. "
    "Keep your answers concise, informative, and formatted cleanly for Telegram chat (use markdown where helpful). "
    "Be helpful and polite, and use emojis to make the interaction lively."
)

def get_or_create_chat(user_id):
    if user_id not in chat_sessions:
        chat_sessions[user_id] = []
    return chat_sessions[user_id]

# 4. Message Handlers
if bot:
    @bot.message_handler(commands=['start'])
    def send_welcome(message):
        user_first_name = message.from_user.first_name
        welcome_text = (
            f"🌟 *Hello, {user_first_name}!* 🌟\n\n"
            "Welcome to your *ChatGPT AI Assistant Bot*!\n"
            "I can answer your questions, help you brainstorm, generate code, or just chat.\n\n"
            "🤖 *How to use me:*\n"
            "• Just send me any message or question, and I will reply using ChatGPT.\n"
            "• Use /reset to clear our conversation history and start fresh.\n"
            "• Use /help to see all available commands.\n\n"
            "Let's get started! What can I help you with today? 💬"
        )
        chat_sessions[message.from_user.id] = []
        bot.reply_to(message, welcome_text, parse_mode='Markdown')

    @bot.message_handler(commands=['help'])
    def send_help(message):
        help_text = (
            "🤖 *ChatGPT AI Bot Commands:*\n\n"
            "• /start - Start the bot, get the welcome message, and reset chat history.\n"
            "• /reset - Clear current conversation memory and start a fresh session.\n"
            "• /help - Display this help manual.\n\n"
            "Simply send me a direct message, and I'll think and respond! 🚀"
        )
        bot.reply_to(message, help_text, parse_mode='Markdown')

    @bot.message_handler(commands=['reset'])
    def reset_chat(message):
        user_id = message.from_user.id
        chat_sessions[user_id] = []
        bot.reply_to(message, "🔄 *Conversation memory has been cleared!* We are starting fresh. Ask me anything! 💬", parse_mode='Markdown')

    @bot.message_handler(func=lambda message: True)
    def chat_with_chatgpt(message):
        user_id = message.from_user.id
        user_text = message.text
        
        try:
            bot.send_chat_action(message.chat.id, 'typing')
        except Exception:
            pass

        if not ai_client:
            bot.reply_to(message, "❌ *Bot Configuration Error:*\nChatGPT API is not initialized.", parse_mode='Markdown')
            return

        try:
            history = get_or_create_chat(user_id)
            messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
            for role, text in history:
                messages.append({"role": role, "content": text})
            messages.append({"role": "user", "content": user_text})

            response = ai_client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.7,
            )
            
            ai_reply = response.choices[0].message.content
            
            if not ai_reply:
                ai_reply = "I'm sorry, I couldn't generate a response."

            history.append(("user", user_text))
            history.append(("assistant", ai_reply))
            if len(history) > 20:
                chat_sessions[user_id] = history[-20:]

            try:
                bot.reply_to(message, ai_reply, parse_mode='Markdown')
            except Exception:
                bot.reply_to(message, ai_reply)

        except Exception as e:
            bot.reply_to(message, "⚠️ *Oops!* I encountered an error while processing your request.", parse_mode='Markdown')

# 5. Start Polling
if __name__ == "__main__":
    if bot:
        print("\n=============================================")
        print("🎉 Telegram ChatGPT AI Bot is now running live! 🎉")
        print("Press Ctrl+C to stop the bot.")
        print("=============================================\n")
        try:
            bot.infinity_polling()
        except KeyboardInterrupt:
            print("Bot stopped by user.")