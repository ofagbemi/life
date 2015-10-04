#include "life.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <functional>
#include <string.h>
using namespace std;

Life::Life() {
  board = new map<long, map<long, bool> >;
}

void Life::set_living(long x, long y) {
  (*board)[x][y] = true;
}

void Life::set_dead(long x, long y) {
  (*board)[x].erase(y);
}

map<long, map<long, bool> >* Life::get_births() {
  map<long, map<long, bool> >* births = new map<long, map<long, bool> >;
  for (auto const &ent1 : *board) {
    for (auto const &ent2 : ent1.second) {
      long x = ent1.first,
           y = ent2.first;
      vector<Point> neighbors = get_neighbors(x, y);
      for (auto &neighbor : neighbors) {
        if (should_give_birth(neighbor.x, neighbor.y)) {
          (*births)[neighbor.x][neighbor.y] = true;
        }
      }
    }
  }
  return births;
}

map<long, map<long, bool> >* Life::get_deaths() {
  map<long, map<long, bool> >* deaths = new map<long, map<long, bool> >;
  for (auto const &ent1 : *board) {
    for (auto const &ent2 : ent1.second) {
      long x = ent1.first,
           y = ent2.first;
      if (should_die(x, y)) {
        (*deaths)[x][y] = true;
      }
    }
  }
  return deaths;
}

string Life::map_to_json(map<long, map<long, bool> >* m) {
  return map_to_json(m, "true");
}

string Life::map_to_json(map<long, map<long, bool> >* m, string existsKey) {
  string json = "{";
  size_t len = json.size();
  for (auto &ent1 : *m) {
    json += ("\"" + to_string(ent1.first) + "\":{");
    int json_size = json.size();
    for (auto &ent2 : ent1.second) {
      json += "\"" + to_string(ent2.first) + "\":" + existsKey + ",";
    }
    if (json_size < json.size()) { json.pop_back(); }
    json += "},";
  }
  if (len < json.size()) { json.pop_back(); }
  json += "}";
  return json;
}

bool Life::should_give_birth(long x, long y) {
  if (board->count(x) == 0 ||
      board->at(x).count(y) == 0) {
    return get_num_live_neighbors(x, y) == 3;
  }
  return false;
}

bool Life::should_die(long x, long y) {
  int n = get_num_live_neighbors(x, y);
  return n < 2 || n > 3;
}

vector<Point> Life::get_neighbors(long x, long y) {
  vector<Point> neighbors;
  long left = x - 1,
       top = y - 1,
       right_edge = left + 3,
       bottom_edge = top + 3;

  if (left < 0) { left = 0; }
  if (top < 0) { top = 0; }

  // iterate through neighbors
  for (long i = left; i < right_edge; i++) {
    for (long j = top; j < bottom_edge; j++) {
      if (i == x && j == y) { continue; }
      Point p(i, j);
      neighbors.push_back(p);
    }
  }
  return neighbors;
}

int Life::get_num_live_neighbors(long x, long y) {
  int live_neighbors = 0;
  vector<Point> neighbors = get_neighbors(x, y);
  for (auto &neighbor : neighbors) {
    if (board->count(neighbor.x)) {
      map<long, bool> m = board->at(neighbor.x);
      if (m.count(neighbor.y)) {
        live_neighbors++;
      }
    }
  }
  return live_neighbors;
}

void Life::add_points(string points) {
  size_t i = 0,
         len = points.size(),
         pos = 0;
  long x, y;

  while (i < len && pos != string::npos) {

    pos = points.find(" ", i);
    x = stol(points.substr(i, pos));
    i = pos + 1;
    pos = points.find(" ", i);
    y = stol(points.substr(i, pos));
    i = pos + 1;

    set_living(x, y);
  }
}

void Life::step() {

  auto births = get_births();
  auto deaths = get_deaths();

  for (auto ent1 : *births) {
    long x = ent1.first;
    for (auto ent2 : ent1.second) {
      long y = ent2.first;
      set_living(x, y);
    }
  }
  string births_json = Life::map_to_json(births);
  delete births;

  for (auto ent1 : *deaths) {
    long x = ent1.first;
    for (auto ent2 : ent1.second) {
      long y = ent2.first;
      set_dead(x, y);
    }
  }
  string deaths_json = Life::map_to_json(deaths, "null");
  delete deaths;

  cout << "{\"births\":";
  cout << births_json;
  cout << ",\"deaths\":";
  cout << deaths_json;
  cout << "}" << endl;
}

void timer(
  function<void(Life*)> exit_fn, Life* life,
  atomic<bool>* shouldClose, unsigned int interval) {

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

  timer(exit_fn, life, &shouldClose, 10000);

  for (string s; getline(cin, s);) {
    shouldClose = false;
    life->add_points(s);
    life->step();
  }
}
