#!/bin/bash
# Script d'optimisation ULTIME pour Trivia 2026 sur Droplet (1Go RAM)

# 1. Correction du blocage "resolving provenance" et forçage BuildKit stable
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
export DOCKER_BUILDKIT=1

echo "⚡ Accélération du Droplet..."

# 2. Ajout de SWAP si manquant (Crucial pour la compilation Java)
if [ ! -f /swapfile ]; then
    echo "💾 Création de 2Go de mémoire virtuelle (SWAP)..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 3. Nettoyage préventif pour libérer de l'espace
echo "🧹 Nettoyage des anciens builds..."
sudo docker builder prune -f

# 4. Construction optimisée
echo "🏗️  Build en cours (Veuillez patienter quelques minutes)..."
# On désactive explicitement la provenance pour éviter le freeze
sudo docker compose build --parallel

# 5. Lancement
echo "🎮 Lancement des services..."
sudo docker compose up -d

echo "✅ TERMINÉ !"
echo "🌐 Si le site ne s'affiche pas, vérifiez le port 8085 sur votre IP."
