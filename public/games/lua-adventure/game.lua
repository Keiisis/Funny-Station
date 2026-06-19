-- === Lua Adventure (Funny Station Lua Game) ===
local js = require "js"
local window = js.global

print("[Lua] Initialisation de l'aventure textuelle en Lua...")

-- Interaction DOM simple
local container = window.document:getElementById("game-canvas-container")
if container then
    container.innerHTML = [[
        <div style="text-align: center; padding: 40px; font-family: monospace;">
            <h2 style="color: #60a5fa; margin-bottom: 20px;">📖 LUA TEXT ADVENTURE</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Vous êtes dans une sombre forêt. Un grimoire Lua repose sur le sol.</p>
            <button id="lua-btn" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 9999px; cursor: pointer; font-weight: bold; font-family: sans-serif;">
                Ramasser le grimoire
            </button>
            <div id="lua-status" style="margin-top: 20px; color: #10b981; font-weight: bold;"></div>
        </div>
    ]]

    -- Gérer le click du bouton en Lua
    local button = window.document:getElementById("lua-btn")
    if button then
        button.onclick = function()
            local status = window.document:getElementById("lua-status")
            if status then
                status.innerHTML = "🏆 Trophée Débloqué en Lua ! (Aventurier Lua)"
            end
            
            -- Débloquer le trophée via le SDK Funny Station
            if window.funnyStation then
                window.funnyStation:unlockTrophy("lua_adventurer")
            end
        end
    end
end
