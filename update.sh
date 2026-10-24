#!/bin/bash

read -rp "Commit message: " message

if [ -z "$message" ]; then
    echo "Error: Commit message cannot be empty."
    exit 1
fi

git add .
git commit -m "$message"
git push origin main
