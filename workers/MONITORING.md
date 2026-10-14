# Myanmar Watch — activation de l’historique partagé

L’interface fonctionne avec la collecte existante. La recherche, les fiches régionales, les lieux, le journal local et les annotations privées ne nécessitent aucune nouvelle clé.

L’historique partagé et la publication de notes éditoriales nécessitent les deux Workers préparés ci-dessous. Ils sont enregistrés sur GitHub, mais ne sont pas déployés automatiquement par le site.

## 1. Collecteur `myanmar-cron`

Remplacer son code par `myanmar-cron-monitoring.mjs`. Conserver les bindings **CACHE** et **DB**, ainsi que le déclencheur `0 * * * *`.

À la prochaine exécution, ce code crée uniquement de nouvelles tables `monitoring_*` dans la base D1 existante. Il conserve `events`, ses données et le fonctionnement du cache RSS. La création est idempotente. Les nouveaux articles et leurs modifications sont enregistrés dans un journal partagé, à partir de l’activation : aucune ancienne version inconnue n’est inventée.

Vérifier les journaux après cette exécution avant de passer au proxy. Une collecte partiellement réussie affiche ses erreurs ; les flux externes peuvent être indisponibles. Le nombre de flux et les nouvelles opérations D1 doivent rester compatibles avec les quotas de votre compte.

## 2. Lecteur `myanmar-proxy`

Remplacer son code par `myanmar-proxy-monitoring.mjs`. Conserver **CACHE** et **DB** vers les mêmes ressources que le cron.

Les accès publics ne déclenchent aucune écriture : `/events`, les flux autorisés et `/monitoring/*` en lecture. Le proxy n’accepte plus d’URL arbitraire et les réponses RSS ont un délai et une taille maximum. Les réponses de l’API ne révèlent pas les erreurs internes.

Les fonctionnalités partagées s’activent automatiquement sur le site après un rechargement quand le service est disponible. La rubrique Sources distingue le collecteur permanent de la session du navigateur.

## 3. Notes éditoriales partagées — facultatif

Dans les paramètres du proxy, créer un **secret** nommé `EDITOR_TOKEN`, avec une valeur aléatoire d’au moins 32 caractères. Ne pas placer cette valeur sur GitHub, dans un lien ou dans le code du site.

Sur le site : Méthode → Ouvrir mes annotations → Validation partagée. Saisir ce secret dans le champ prévu. Il reste uniquement en mémoire de la page et est transmis au proxy par HTTPS. Recharger la page déconnecte l’éditeur.

La publication porte sur une note associée à un article déjà archivé : retenir pour analyse, proposer une correction ou écarter de l’analyse. Elle ne modifie pas automatiquement les coordonnées, le contrôle territorial ou un statut « confirmé ». Les notes publiées deviennent publiques ; les annotations privées restent sur l’appareil jusqu’à leur export.

## Validation réalisée

- 20 contrôles de régression du site existant.
- 11 contrôles de l’extraction des signalements.
- 11 contrôles des règles de recherche, chronologie, changements et annotations.
- 9 contrôles du proxy : authentification, lectures sans écriture, cibles interdites, types de réponse et CORS.
- Test SQLite du journal : pas de nouvelle version pour un rafraîchissement inchangé ; conservation de la version précédente lors d’une correction.
- Contrôles visuels sur ordinateur et téléphone.

Les tests serveur utilisent des simulations et SQLite local. Ils ne constituent pas un déploiement ni une validation des quotas ou de l’accès D1 dans votre compte Cloudflare.

## Limites explicites

Les chiffres du flux comptent des articles, pas des événements indépendants. Les catégories restent une classification automatique par mots-clés. Les localisations du flux restent régionales. Le journal partagé porte sur les publications et les notes éditoriales, pas sur une reconstitution des anciennes frontières. Les sources historiques d’un lieu sont conservées comme références à revérifier.

L’interface affiche les données partagées Irrawaddy des 90 derniers jours avec une limite de chargement de 10 000 articles ; les autres articles restent disponibles dans le flux et dans `events`. La carte n’est pas une preuve d’absence de violence dans une zone sans signalement.
