// generic configuration
let canvasWidth = 800;
let canvasHeight = 800;
let fr = 30;
let gridSize = 80;

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  background(255);
  frameRate(fr);

  manager
    .addOperation(function() {
      grid.init().draw();
      target.draw();
    }, function() {
      return false;
    })
    .addOperation(function() {
      player.move(target.pos, 10.0);
    }, function() {
      //return player.pos.x == target.pos.x && player.pos.y == target.pos.y;
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
  move: function(targetPos, duration) {
    var self = this;
    var startPosition = db.get("startPosition");
    if (null === startPosition) {
      startPosition = db.set("startPosition", {
        x: self.pos.x,
        y: self.pos.y
      });
    }

    // workaround: exact position (does it work?)
    if (targetPos.x - self.pos.x <= 4 && targetPos.y - self.pos.y <= 4) {
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
    var cols = Math.round(width/gridSize);
    var rows = Math.round(height/gridSize);
    this.data = new Array(rows);
    for (var i=0; i<rows; i++) {
      this.data[i]= new Array(cols);
      for (var j=0; j<cols; j++) {
        this.data[i][j] = {};
      }
    }
    
    return this;
  },
  draw: function() {
    for (var i=0; i<this.data.length;i++) {
      line(0, i*gridSize, width, i*gridSize);
    }
    for (i=0; i<this.data[0].length;i++) {
      line(i*gridSize, 0, i*gridSize, height);
    }
  }
};

function draw() {
  background(255);
  manager.runOperations();
}
