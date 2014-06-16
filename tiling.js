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
        return Math.round(x, 6) + ':' + Math.round(y, 6);
    };

    function Model() {
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

    Model.prototype.render = function(canvas) {
        var context = canvas.getContext('2d');
        var w = canvas.width;
        var h = canvas.height;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.translate(w / 2, h / 2);
        context.scale(SCALE, SCALE);
        context.fillStyle = BG_COLOR;
        context.fillRect(-w / 2, -h / 2, w, h);
        this.shapes.forEach(function(shape) {
            shape.render(context);
        });
    };

    return {
        Model: Model,
        Shape: Shape
    };
}));
