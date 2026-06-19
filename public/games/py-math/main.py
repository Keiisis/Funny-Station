# === PyPyodide Math (Funny Station Python Script) ===
import numpy as np
import funny_station

print("======================================================")
print("   📊 FUNNY STATION - RUNTIME PYTHON (PYODIDE ACTIVE)  ")
print("======================================================")
print("Initialisation du moteur de calcul vectoriel...")

# Création de deux matrices aléatoires 3x3
print("\n[Étape 1] Génération de matrices aléatoires via NumPy...")
matrix_a = np.random.randint(1, 10, size=(3, 3))
matrix_b = np.random.randint(1, 10, size=(3, 3))

print("\n--- MATRICE A ---")
print(matrix_a)

print("\n--- MATRICE B ---")
print(matrix_b)

# Produit matriciel
print("\n[Étape 2] Calcul du produit matriciel (A x B)...")
result = np.dot(matrix_a, matrix_b)

print("\n--- RÉSULTAT DU CALCUL MATRICIEL ---")
print(result)

# Inversion de la matrice résultat (si elle est inversible)
print("\n[Étape 3] Analyse d'inversibilité...")
try:
    det = np.linalg.det(result)
    print(f"Déterminant de la matrice résultat : {det:.4f}")
    if abs(det) > 1e-5:
        inv_result = np.linalg.inv(result)
        print("\n--- INVERSE DE LA MATRICE RÉSULTAT ---")
        print(inv_result)
    else:
        print("La matrice résultat n'est pas inversible.")
except Exception as e:
    print(f"Erreur d'inversion : {e}")

# Débloquer un trophée via le SDK Python
print("\n[Étape 4] Notification au Funny Kernel...")
print("[Python] Envoi de l'événement de déblocage de trophée 't2'...")
funny_station.unlock_trophy('python_dev')

print("\nCalculs terminés avec succès. Processus en veille.")
