# 🌐 Funny Station — Protocole Multijoueur en ligne (FunnyNet)

Un **SDK réutilisable** qui rend n'importe quel jeu Funny Station jouable en ligne, sans
réécrire de netcode. Modèle **host-authoritative** + **interpolation client** (rendu fluide
60 fps même si le réseau n'envoie que 20-30 paquets/s).

- SDK : [`public/funny-netplay.js`](public/funny-netplay.js) — `window.FunnyNet`
- Exemple complet jouable : [`public/games/orb-arena/index.js`](public/games/orb-arena/index.js)
- Le runner (`UniversalRuntimeRunner`) relaie déjà les messages via Supabase Realtime ;
  le SDK est **auto-injecté** dans les jeux JS (`<script src="/funny-netplay.js">`).

## Principe

```
        CLIENT                         HÔTE (autorité)
  ┌───────────────┐   input (réseau)  ┌────────────────────┐
  │ FunnyNet      │ ───────────────▶  │ FunnyNet.onInput   │
  │ .sendInput()  │                   │ → applique l'input │
  │               │                   │ → step() logique   │
  │ .onRenderState│ ◀─────────────── │ .broadcastState()  │
  │ (interpolé)   │   état (réseau)   └────────────────────┘
  └───────────────┘
```

L'hôte est seul maître de la logique → pas de triche ni de désync. Les clients
**prédisent** rien : ils envoient leurs touches et affichent l'état **interpolé** (lissé
entre les 2 derniers paquets) → mouvement fluide.

## API

```js
FunnyNet.init({ tickRate: 22, interpDelay: 90 }); // réglages (optionnels)

FunnyNet.isOnline      // true en host/client
FunnyNet.isHost        // l'hôte exécute la logique
FunnyNet.isClient      // le client n'affiche que l'état reçu
FunnyNet.playerNumber  // 0..3 — le joueur local

// ── HÔTE ──
FunnyNet.onInput(inp => { /* inp.playerNumber, inp.direction, inp.action ('down'|'up') */ });
FunnyNet.broadcastState(stateObj);   // throttlé au tickRate

// ── CLIENT ──
FunnyNet.sendInput({ direction: 'LEFT', action: 'down' });
FunnyNet.onRenderState(state => render(state));  // état INTERPOLÉ, à chaque frame
FunnyNet.onState(state => { /* état brut, si tu veux gérer l'interpolation toi-même */ });
```

### Interpolation générique
`broadcastState(state)` accepte n'importe quel objet. Côté client, le SDK **lerp
récursivement tous les nombres** (objets + tableaux ; les champs non numériques prennent
la valeur cible). Donc un état comme
`{ players:[{x,y,score,color}], orbs:[{x,y}], frame }` est interpolé tout seul : `x`, `y`,
`score`, `frame` sont lissés, `color` reste tel quel. Aucun réglage par jeu.

## Recette pour rendre TON jeu multijoueur (4 étapes)

```js
FunnyNet.init();

if (FunnyNet.isClient) {
  // 1) envoyer les inputs locaux
  onKeyDown(dir => FunnyNet.sendInput({ direction: dir, action: 'down' }));
  onKeyUp(dir   => FunnyNet.sendInput({ direction: dir, action: 'up' }));
  // 2) afficher l'état interpolé
  FunnyNet.onRenderState(state => draw(state));
} else { // host ou solo
  // 3) appliquer les inputs distants (host)
  if (FunnyNet.isHost) FunnyNet.onInput(i => setHeld(i.playerNumber, i.direction, i.action));
  // 4) boucle : logique + (host) diffusion
  function loop() {
    step();
    draw(localState());
    if (FunnyNet.isHost) FunnyNet.broadcastState(localState());
    requestAnimationFrame(loop);
  }
  loop();
}
```

En **solo** (`isOnline === false`), `broadcastState`/`sendInput` sont des no-ops : le même
code tourne sans réseau. Pas de branche conditionnelle lourde.

## Migration d'hôte (l'hôte peut tomber sans tuer la partie)

Si l'hôte **perd la connexion** (crash, fermeture d'onglet → chute de présence), un
remplaçant est élu **automatiquement** et la partie continue :

1. `GameRoom` détecte l'absence de l'hôte dans la présence Supabase.
2. Élection **déterministe** : le joueur présent au plus petit `playerNumber` gagne
   (départage par `userId`). Tous les clients calculent le même → pas de coordination.
3. Le nouvel hôte : `GameStateSync.setHost(true)`, son runner repasse `networkMode='host'`
   et envoie `FUNNY_ROLE_CHANGE` au SDK.
4. Côté SDK : `FunnyNet.onRoleChange({ seed })` se déclenche ; le jeu **reprend depuis
   le dernier état reçu** (`seed`) et redevient autorité (cf. `orb-arena`).

```js
FunnyNet.onRoleChange((info) => {
  if (info.isHost) seedWorldFrom(info.seed); // reprend là où l'ancien hôte s'était arrêté
});
```

Note : une sortie **explicite** de l'hôte (bouton Quitter) diffuse `room_closed` =
fin de session pour tous (intentionnel). La migration ne concerne que les **chutes**.

## Limites connues
- Pas de prédiction d'input côté client (mouvement = latence aller-retour). L'interpolation
  masque la gigue ; pour un jeu très rapide on pourrait ajouter de la prédiction plus tard.
- 4 joueurs max (aligné sur la manette et le lobby).
- La graine de migration = dernier état reçu : un ou deux ticks peuvent être rejoués,
  invisible en pratique grâce à l'interpolation.
