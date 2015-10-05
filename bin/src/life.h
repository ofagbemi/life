#ifndef LIFE_H_
#define LIFE_H_

#include <map>
#include <vector>
#include "point.h"

class Life {
  std::map <long, std::map<long, bool> >* board;

  public:
    Life();
    ~Life();
    void step();
    void add_points(std::string);
    void set_living(long, long);
    void set_dead(long, long);
    std::map<long, std::map<long, bool> >* get_births();
    std::map<long, std::map<long, bool> >* get_deaths();

    static std::string map_to_json(std::map<long, std::map<long, bool> >*);
    static std::string map_to_json(std::map<long, std::map<long, bool> >*, std::string);

  private:
    bool should_give_birth(long, long);
    bool should_die(long, long);
    std::vector<Point> get_neighbors(long, long);
    int get_num_live_neighbors(long, long);
};

#endif
