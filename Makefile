CXX=g++

FLAGS=-g -Wall -pthread -std=c++11 -Ofast

SRC_FILES=bin/src/main.cc bin/src/life.cc
BIN_PATH=bin/life

.PHONY: all clean

all: life

life: $(SRC_FILES)
	$(CXX) $(FLAGS) $(SRC_FILES) -o $(BIN_PATH)

clean:
	-rm bin/life
	-rm -rf life.dSYM
