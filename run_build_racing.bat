@echo off
"C:\Program Files\Unity\Hub\Editor\6000.0.77f1\Editor\Unity.exe" -batchmode -nographics -quit -projectPath "unity-project" -executeMethod WebGLBuilder.BuildRacingGame -logFile "unity_build_log_new.txt"
echo Exit code: %ERRORLEVEL%
