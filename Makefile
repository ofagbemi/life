CXX=g++

FLAGS=-g -Wall -pthread -std=c++11 -Ofast
BIN_PATH=bin/life
SRC_PATH=bin/src/life.cc

all: life

life: $(SRC_PATH)
	$(CXX) $(FLAGS) $(SRC_PATH) -o $(BIN_PATH)
