#!/bin/bash
# Script d'optimisation de déploiement pour Trivia 2026

# 1. Désactiver les attestations Docker qui font freezer le build
export BUILDX_NO_DEFAULT_ATTESTATIONS=1

echo "⚡ Optimisation du Droplet en cours..."

# 2. Ajout automatique de SWAP (Essentiel pour compiler sur 1Go de RAM)
if [ ! -f /swapfile ]; then
    echo "💾 Création de 2Go de mémoire virtuelle (SWAP)..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 3. Mise à jour rapide (sans upgrade système lent)
echo "📦 Mise à jour des dépôts..."
sudo apt-get update -y

# 4. Installation Docker si manquant
if ! command -v docker &> /dev/null; then
    echo "🐳 Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
fi

# 5. Build et Lancement accéléré
echo "🏗️  Construction et lancement (BuildKit optimisé)..."
# Utilisation du cache local et désactivation de la provenance pour la vitesse
sudo docker compose build
sudo docker compose up -d

echo "✅ DÉPLOIEMENT RÉUSSI !"
echo "🌐 Jeu accessible sur : http://VOTRE_IP_SERVEUR:8085"
