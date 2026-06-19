@echo off
"C:\Program Files\Unity\Hub\Editor\6000.0.77f1\Editor\Unity.exe" -batchmode -nographics -quit -projectPath "C:\Users\HP\Desktop\Funny Station\unity-project" -executeMethod WebGLBuilder.Build -logFile "C:\Users\HP\Desktop\Funny Station\unity_build_log.txt"
echo Exit code: %ERRORLEVEL%
