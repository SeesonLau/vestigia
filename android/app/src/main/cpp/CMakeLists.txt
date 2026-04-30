cmake_minimum_required(VERSION 3.22.1)
project("thermal_uvc")

add_library(thermal_uvc SHARED thermal_uvc.cpp)

target_link_libraries(thermal_uvc android log)
