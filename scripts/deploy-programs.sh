#!/bin/bash

# VeilPool - Deploy All Programs to Devnet
# Run this script to deploy all Solana programs

set -e

echo "🚀 VeilPool Deployment Script"
echo "=============================="
echo ""

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install from https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor not found. Install from https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Get current config
echo "📡 Current Solana Configuration:"
solana config get
echo ""

# Confirm devnet
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ ! "$CLUSTER" =~ "devnet" ]]; then
    echo "⚠️  Not connected to devnet!"
    read -p "Switch to devnet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        solana config set --url https://api.devnet.solana.com
    else
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Check wallet balance
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "💰 Wallet Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "⚠️  Low balance! You need at least 5 SOL for deployment."
    echo "   Request airdrop: solana airdrop 5"
    read -p "Request airdrop now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        solana airdrop 5
        sleep 2
    fi
fi

echo ""
echo "🔨 Building programs..."
anchor build

echo ""
echo "📦 Deploying programs to devnet..."
anchor deploy

echo ""
echo "🔑 Program IDs:"
anchor keys list

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the program IDs above"
echo "2. Update app/.env.local with the new IDs"
echo "3. Restart the Next.js app: cd app && npm run dev"
echo ""
echo "🎯 Test your deployment:"
echo "   solana program show <PROGRAM_ID>"
echo ""
