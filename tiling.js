(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('tiling', [], factory);
    } else {
        // Browser globals
        root.tiling = factory();
    }
}(this, function (tiling) {
    var LINE_WIDTH = 0.1;
    var MARGIN = 0.1;
    var SCALE = 64;
    var BG_COLOR = 'black';
    var FILL_COLOR = '#885555';
    var LINE_COLOR = '#cccccc';

    function Shape(sides, x, y, rotation) {
        this.sides = sides;
        this.x = x || 0;
        this.y = y || 0;
        this.rotation = rotation || 0;
    };
    Shape.prototype.copy = function(x, y) {
        return new Shape(this.sides, x, y, this.rotation);
    };
    Shape.prototype.points = function(margin) {
        margin = margin || 0;
        var angle = (2 * Math.PI) / this.sides;
        var rotation = this.rotation - (Math.PI / 2);
        if (this.sides % 2 == 0) {
            rotation += angle / 2;
        }
        var angles = [];
        for (var i = 0; i < this.sides; i++) {
            angles.push((angle * i) + rotation);
        }
        angles.push(angles[0]);
        var d = 0.5 / Math.sin(angle / 2) - margin / Math.cos(angle / 2);
        var x = this.x, y = this.y;
        var points = angles.map(function(angle) {
            return {
                x: x + (Math.cos(angle) * d),
                y: y + (Math.sin(angle) * d)
            };
        });
        return points;
    };
    Shape.prototype.adjacent = function(sides, edge) {
        var points = this.points();
        var p1 = points[edge];
        var p2 = points[edge + 1];
        var angle = 2 * Math.PI / sides;
        var a = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        var b = a - (Math.PI / 2);
        var d = 0.5 / Math.tan(angle / 2);
        var x = p1.x + ((p2.x - p1.x) / 2.0) + Math.cos(b) * d;
        var y = p1.y + ((p2.y - p1.y) / 2.0) + Math.sin(b) * d;
        a += angle * Math.floor((sides - 1) / 2);
        return new Shape(sides, x, y, a);
    };
    Shape.prototype.render = function(context) {
        var points = this.points(MARGIN);
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        points.forEach(function(point, i) {
            if (i == 0) return;
            context.lineTo(point.x, point.y);
        })
        context.closePath();
        context.fillStyle = FILL_COLOR;
        context.strokeStyle = LINE_COLOR;
        context.lineWidth = LINE_WIDTH;
        context.fill();
        context.stroke();
    };

    function coordsToKey(x, y) {
        return x.toFixed(6) + ':' + y.toFixed(6);
    };

    function Model(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.shapes = [];
        this.lookup = {};
    };
    Model.prototype.append = function(shape) {
        this.shapes.push(shape);
        this.lookup[coordsToKey(shape.x, shape.y)] = shape;
        return this.shapes.length - 1;
    };
    Model.prototype.add = function(index, edge, sides) {
        var parent = this.shapes[index];
        var shape = parent.adjacent(sides, edge);
        return this.append(shape);
    };
    Model.prototype.addAll = function(indexes, edges, sides) {
        var addedIndexes = [];
        var self = this;
        indexes.forEach(function(index) {
            edges.forEach(function(edge) {
                addedIndexes.push(self.add(index, edge, sides));
            });
        });
        return addedIndexes;
    };
    Model.prototype.repeat = function(indexes) {
        var depth = 0;
        var memo = {};
        var done = {};
        do {
            this._repeat(indexes, 0, 0, depth, memo, done);
            depth++;
        } while(!(done.tl && done.tr && done.bl && done.br));
    };
    Model.prototype.addRepeats = function(x, y) {
        var self = this;
        this.shapes.forEach(function(shape) {
            var newX = x + shape.x;
            var newY = y + shape.y;
            var key = coordsToKey(newX, newY);
            if (self.lookup[key]) return;
            self.lookup[key] = shape.copy(newX, newY);
        });
    };
    Model.prototype._repeat = function(indexes, x, y, depth, memo, done) {
        if (depth < 0) {
            return;
        }
        var maxX = this.width / 2 / SCALE;
        var maxY = this.height / 2 / SCALE;
        if ((x < -maxX && y < -maxY)) done.tl = true;
        if ((x < -maxX && y > maxY)) done.bl = true;
        if ((x > maxX && y > maxY)) done.br = true;
        if ((x > maxX && y < -maxY)) done.tr = true;

        var key = coordsToKey(x, y);
        var previousDepth = memo[key] || -1;
        if (previousDepth >= depth) {
            return;
        }
        memo[key] = depth;
        if (previousDepth == -1) {
            this.addRepeats(x, y);
        }
        var self = this;
        indexes.forEach(function(index) {
            var shape = self.shapes[index];
            self._repeat(indexes, x + shape.x, y + shape.y, depth - 1, memo, done);
        });
    };

    Model.prototype.render = function() {
        var context = this.canvas.getContext('2d');
        context.save();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.translate(this.width / 2, this.height / 2);
        context.scale(SCALE, SCALE);
        context.fillStyle = BG_COLOR;
        context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        var self = this;
        Object.keys(this.lookup).forEach(function(k) {
            self.lookup[k].render(context);
        });
        context.restore();
    };

    return {
        Model: Model,
        Shape: Shape
    };
}));
