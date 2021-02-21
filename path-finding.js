// <astar.js>
// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html
(function(definition) {
  /* global module, define */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    define([], definition);
  } else {
    var exports = definition();
    window.astar = exports.astar;
    window.Graph = exports.Graph;
  }
})(function() {

function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

var astar = {
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(graph, start, end, options) {
    graph.cleanDirty();
    options = options || {};
    var heuristic = options.heuristic || astar.heuristics.manhattan;
    var closest = options.closest || false;

    var openHeap = getHeap();
    var closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);

    while (openHeap.size() > 0) {

      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      var neighbors = graph.neighbors(currentNode);

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        var gScore = currentNode.g + neighbor.getCost(currentNode);
        var beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan: function(pos0, pos1) {
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
      var D = 1;
      var D2 = Math.sqrt(2);
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    }
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
};

/**
 * A graph memory structure
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options]
 * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
 */
function Graph(gridIn, options) {
  options = options || {};
  this.nodes = [];
  this.diagonal = !!options.diagonal;
  this.grid = [];
  for (var x = 0; x < gridIn.length; x++) {
    this.grid[x] = [];

    for (var y = 0, row = gridIn[x]; y < row.length; y++) {
      var node = new GridNode(x, y, row[y]);
      this.grid[x][y] = node;
      this.nodes.push(node);
    }
  }
  this.init();
}

Graph.prototype.init = function() {
  this.dirtyNodes = [];
  for (var i = 0; i < this.nodes.length; i++) {
    astar.cleanNode(this.nodes[i]);
  }
};

Graph.prototype.cleanDirty = function() {
  for (var i = 0; i < this.dirtyNodes.length; i++) {
    astar.cleanNode(this.dirtyNodes[i]);
  }
  this.dirtyNodes = [];
};

Graph.prototype.markDirty = function(node) {
  this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function(node) {
  var ret = [];
  var x = node.x;
  var y = node.y;
  var grid = this.grid;

  // West
  if (grid[x - 1] && grid[x - 1][y]) {
    ret.push(grid[x - 1][y]);
  }

  // East
  if (grid[x + 1] && grid[x + 1][y]) {
    ret.push(grid[x + 1][y]);
  }

  // South
  if (grid[x] && grid[x][y - 1]) {
    ret.push(grid[x][y - 1]);
  }

  // North
  if (grid[x] && grid[x][y + 1]) {
    ret.push(grid[x][y + 1]);
  }

  if (this.diagonal) {
    // Southwest
    if (grid[x - 1] && grid[x - 1][y - 1]) {
      ret.push(grid[x - 1][y - 1]);
    }

    // Southeast
    if (grid[x + 1] && grid[x + 1][y - 1]) {
      ret.push(grid[x + 1][y - 1]);
    }

    // Northwest
    if (grid[x - 1] && grid[x - 1][y + 1]) {
      ret.push(grid[x - 1][y + 1]);
    }

    // Northeast
    if (grid[x + 1] && grid[x + 1][y + 1]) {
      ret.push(grid[x + 1][y + 1]);
    }
  }

  return ret;
};

Graph.prototype.toString = function() {
  var graphString = [];
  var nodes = this.grid;
  for (var x = 0; x < nodes.length; x++) {
    var rowDebug = [];
    var row = nodes[x];
    for (var y = 0; y < row.length; y++) {
      rowDebug.push(row[y].weight);
    }
    graphString.push(rowDebug.join(" "));
  }
  return graphString.join("\n");
};

function GridNode(x, y, weight) {
  this.x = x;
  this.y = y;
  this.weight = weight;
}

GridNode.prototype.toString = function() {
  return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function(fromNeighbor) {
  // Take diagonal weight into consideration.
  if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
    return this.weight * 1.41421;
  }
  return this.weight;
};

GridNode.prototype.isWall = function() {
  return this.weight === 0;
};

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};

return {
  astar: astar,
  Graph: Graph
};

});
// </astar.js>

// generic configuration
let canvasWidth = 800;
let canvasHeight = 800;
let fr = 30;
let gridSize = 20;

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  background(255);
  frameRate(fr);

  manager
    .addOperation(function() {
      grid.init();
      db.set("gridIsInitialized", true);
    }, function() {
      return null != db.get("gridIsInitialized") && db.get("gridIsInitialized");
    })
    .addOperation(function() {
      //grid.draw();
      target.draw();
      obstacle.draw();
    }, function() {
      return false;
    })
    .addOperation(function() {
      //player.draw();
      path.calculate();
      if (path.result && 0 < path.result.length) {
        //player.move(grid.getPosFromCell(path.result[0].y, path.result[0].x), 0.1);
        player.moveToGrid(path.result[0].y, path.result[0].x, 0.5);
      }
    }, function() {
      return false;
    });
}

var player = {
  pos: {
    x: 50.0,
    y: 50.0
  },
  draw: function() {
    var self = this;

    fill(200);
    ellipse(self.pos.x, self.pos.y, 20, 20);
  },
  moveToGrid: function(row, col, duration) {
    var self = this;
    var targetPos = grid.getPosFromCell(row, col);
    self.pos.x += (targetPos.x - self.pos.x) / duration / fr;
    self.pos.y += (targetPos.y - self.pos.y) / duration / fr;
    self.draw();
  },
  move: function(targetPos, duration) {
    var self = this;
    /*
    var startPosition = db.get("startPosition");
    if (null === startPosition) {
      startPosition = db.set("startPosition", {
        x: self.pos.x,
        y: self.pos.y
      });
    }
    */
    var startPosition = targetPos;

    // workaround: exact position (does it work?)
    if (targetPos.x - self.pos.x <= 1 && targetPos.y - self.pos.y <= 1) {
      self.pos.x = targetPos.x;
      self.pos.y = targetPos.y;
    } else {
      self.pos.x += (targetPos.x - startPosition.x) / duration / fr;
      self.pos.y += (targetPos.y - startPosition.y) / duration / fr;
    }

    self.draw();
  }
};

var target = {
  pos: {
    x: 750.0,
    y: 350.0
  },
  draw: function() {
    var self = this;

    fill(60);
    ellipse(self.pos.x, self.pos.y, 4, 4);
  }
};

var db = {
  data: {
    operations: []
  },
  get: function(k) {
    var self = this;

    if ("undefined" === typeof self.data[k]) {
      return null;
    }

    return self.data[k];
  },
  set: function(k, v) {
    this.data[k] = v;
    return this.data[k];
  }
};

var manager = {
  addOperation: function(operation, terminator) {
    db.get("operations").push({
      run: operation,
      terminate: terminator
    });

    return this;
  },
  runOperations: function() {
    var self = this;

    // workaround: make sure that draw is called at least for once.
    if (null === db.get("drawIsRun")) {
      db.set("drawIsRun", true);
      return;
    }

    db.get("operations").forEach(operation => function() {
      if (operation.terminate()) {
        self.removeOperation(this);
        return
      }

      operation.run();
    }());

    return this;
  },
  removeOperation: function(operation) {
    var idx = db.get("operations").indexOf(operation);
    if (-1 !== idx) {
      db.get("operations").splice(idx, 1);
    }
  }
};

var grid = {
  data: null,
  init: function() {
    var cols = Math.round(width / gridSize);
    var rows = Math.round(height / gridSize);
    this.data = new Array(rows);
    for (var i = 0; i < rows; i++) {
      this.data[i] = new Array(cols);
      for (var j = 0; j < cols; j++) {
        this.data[i][j] = {
          obstacle: false
        };
      }
    }

    return this;
  },
  draw: function() {
    var self = this;
    
    for (var i = 0; i < self.data.length; i++) {
      line(0, i * gridSize, width, i * gridSize);
    }
    for (i = 0; i < self.data[0].length; i++) {
      line(i * gridSize, 0, i * gridSize, height);
    }
    
    if (null !== path.result) {
      fill("green");
      path.result.forEach(gridNode => function() {
        self.fillCell(gridNode.x, gridNode.y);
      }());
    }
  },
  fillCell: function(col, row) {
    square(col*gridSize, row*gridSize, gridSize);
  },
  addObstacle: function(row, col) {
    var self = this;
    
    self.data[row][col].obstacle = true;
  },
  removeObstacle: function(row, col) {
    var self = this;
    
    self.data[row][col].obstacle = false;
  },
  // the grid is transposed as astar needs that
  getGraph: function() {
    var self = this;
    
    var graph = new Array(self.data[0].length);
    for (var j=0; j<self.data[0].length; j++) {
      graph[j] = new Array(self.data.length);
      for (var i=0; i<self.data.length; i++) {
        graph[j][i] = (self.data[i][j].obstacle) ? 0 : 1;
      }
    }
    return graph;
  },
  getCellFromPos: function(x, y) {
    return {
      row: Math.floor(y/gridSize),
      col: Math.floor(x/gridSize)
    };
  },
  getPosFromCell: function(row, col) {
    return {
      x: col*gridSize+gridSize/2,
      y: row*gridSize+gridSize/2
    };
  }
};

var obstacle = {
  data: [],
  add: function(x, y) {
    var self = this;
    var gridCell = grid.getCellFromPos(x, y)
    self.data.push({
      x: x,
      y: y,
      gridRow: gridCell.row,
      gridCol: gridCell.col
    });
    
    grid.addObstacle(gridCell.row, gridCell.col);
  },
  draw: function() {
    var self = this;
    
    if (keyIsDown(67)) { // 'c'
      self.data = [];
      return;
    }
    
    /*
    fill(25);
    self.data.forEach(o => function() {
      grid.fillCell(o.gridCol, o.gridRow);
    }());
    */
    
    stroke("red");
    strokeWeight(5);
    self.data.forEach(o => function() {
      point(o.x, o.y);
    }());
    stroke("black");
    strokeWeight(1);
  },
  
};

var path = {
  result: null,
  find: function(startX, startY, endX, endY) {
    var self = this;
    var graph = new Graph(grid.getGraph());
    return astar.search(graph, graph.grid[startX][startY], graph.grid[endX][endY]);
  },
  calculate: function() {
    var self = this;
    
    var playerCell = grid.getCellFromPos(player.pos.x, player.pos.y)
    var targetCell = grid.getCellFromPos(target.pos.x, target.pos.y)
    var result= path.find(playerCell.col, playerCell.row, targetCell.col, targetCell.row);
    self.result = result;
    return result;
  }
};

function mouseDragged(e) {
  obstacle.add(e.x, e.y);
}

function draw() {
  background(255);
  manager.runOperations();
}
