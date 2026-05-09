#!/bin/bash
# Script d'installation automatique pour Trivia 2026 sur un VPS Ubuntu/Debian

# Correction pour éviter le blocage "resolving provenance" sur certains serveurs
export BUILDX_NO_DEFAULT_ATTESTATIONS=1

echo "🚀 Début de l'installation de Trivia..."

# 1. Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Installation de Docker et Docker Compose
if ! command -v docker &> /dev/null
then
    echo "🐳 Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker est déjà installé."
fi

# 3. Lancement du jeu
echo "🎮 Lancement des conteneurs Trivia..."
# Utilisation de --provenance=false pour éviter le bug de métadonnées
sudo docker compose build --no-cache --pull
sudo docker compose up -d

echo "✅ DÉPLOIEMENT TERMINÉ !"
echo "🌐 Votre jeu est accessible sur le port 8085 de ce serveur."
echo "👉 http://VOTRE_ADRESSE_IP:8085"
