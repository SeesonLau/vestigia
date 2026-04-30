cmake_minimum_required(VERSION 3.13)

# Must be "appmodules" — DefaultSoLoader.maybeLoadSoLibrary() loads libappmodules.so
# which triggers JNI_OnLoad to set up the TurboModule registry.
project(appmodules)

# React Native application setup: builds libappmodules.so with:
# - default-app-setup/OnLoad.cpp (TurboModule + Fabric provider registration)
# - Android-autolinking.cmake (all autolinked C++ module stubs)
# - linkage against jsi, fbjni, reactnative prefab packages
# No .cpp files in this directory → it uses the default OnLoad.cpp automatically.
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Thermal UVC camera library — built as a separate .so, loaded explicitly
# by UVCModule.kt via System.loadLibrary("thermal_uvc").
add_library(thermal_uvc SHARED
    ${CMAKE_CURRENT_SOURCE_DIR}/../cpp/thermal_uvc.cpp)
target_compile_options(thermal_uvc PRIVATE -std=c++17)
target_link_libraries(thermal_uvc android log)
