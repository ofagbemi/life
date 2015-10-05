#include <atomic>
#include <chrono>
#include <thread>
#include <functional>
#include <iostream>
#include "life.h"
using namespace std;

void timer(
  function<void(Life*)> exit_fn, Life* life,
  atomic<bool>* shouldClose, unsigned long interval) {

  thread([exit_fn, life, shouldClose, interval]() {
    while (true) {
      if (*shouldClose) {
        exit_fn(life);
      } else {
        *shouldClose = true;
        this_thread::sleep_for(chrono::milliseconds(interval));
      }
    }
  }).detach();
}

void exit_fn(Life* life) {
  delete life;
  exit(0);
}

int main(int argc, char* argv[]) {
  atomic<bool> shouldClose(false);
  Life* life = new Life();

  timer(exit_fn, life, &shouldClose, 600000);

  for (string s; getline(cin, s);) {
    shouldClose = false;
    life->add_points(s);
    life->step();
  }
}
