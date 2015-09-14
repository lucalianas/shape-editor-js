
/* globals Raphael: false */
/* globals console: false */

var Point = function Point(options) {
    var self = this;
    this.manager = options.manager;
    this.paper = options.paper;

    if (options.id) {
        this._id = options.id;
    } else {
        this._id = this.manager.getRandomId();
    }
    this._cx = options.cx;
    this._cy = options.cy;
    this._rx = this._ry = options.r;
    this._rotation = options.rotation || 0;

    this._yxRatio = 1;

    this._strokeColor = options.strokeColor;
    this._strokeWidth = options.strokeWidth || 2;
    this._selected = false;
    this._zoomFraction = 1;
    if (options.zoom) {
        this._zoomFraction = options.zoom / 100;
    }

    this.element = this.paper.ellipse();
    this.element.attr({'fill-opacity': 1, 'fill': '#fff'});

    // Drag handling of ellipse
    if (this.manager.canEdit) {
        this.element.drag(
            function (dx, dy) {
                // DRAG, update location and redraw
                dx = dx / self._zoomFraction;
                dy = dy / self._zoomFraction;
                self._cx = dx + this.ox;
                self._cy = this.oy + dy;
                self.drawShape();
                return false;
            },
            function () {
                // START drag: note the start location
                self._handleMousedown();
                this.ox = self._cx;
                this.oy = self._cy;
                return false;
            },
            function () {
                // STOP
                // notify changed if moved
                if (this.ox !== self._cx || this.oy !== self._cy) {
                    self.manager.notifyShapeChanged(self);
                }
                return false;
            }
        );
    }

    this.drawShape();
};

Point.prototype.toJson = function toJson() {
    var rv = {
        'type': 'Ellipse',
        'cx': this._cx,
        'cy': this._cy,
        'rx': this._rx,
        'ry': this._ry,
        'rotation': this._rotation,
        'strokeWidth': this._strokeWidth,
        'strokeColor': this._strokeColor,
        'fillColor': this._strokeColor
    };
    if (this._id) {
        rv.id = this._id;
    }
    return rv;
};

Point.prototype.compareCoords = function compareCoords(json) {

    var selfJson = this.toJson(),
        match = true;
    if (json.type !== selfJson.type) {
        return false;
    }
    ['cx', 'cy', 'rx', 'ry', 'rotation'].forEach(function(c){
        if (json[c] !== selfJson[c]) {
            match = false;
        }
    });
    return match;
};

// Useful for pasting json with an offset
Point.prototype.offsetCoords = function offsetCoords(json, dx, dy) {
    json.cx = json.cx + dx;
    json.cy = json.cy + dy;
    return json;
};

// handle start of drag by selecting this shape
Point.prototype._handleMousedown = function _handleMousedown() {
    this.manager.selectShape(this);
};

Point.prototype.setColor = function setColor(strokeColor) {
    this._strokeColor = strokeColor;
    this.drawShape();
};

Point.prototype.getStrokeColor = function getStrokeColor() {
    return this._strokeColor;
};

Point.prototype.setStrokeColor = function setStrokeColor(strokeColor) {
    this._strokeColor = strokeColor;
    this.drawShape();
};

Point.prototype.setStrokeWidth = function setStrokeWidth(strokeWidth) {
    this._strokeWidth = strokeWidth;
    this.drawShape();
};

Point.prototype.getStrokeWidth = function getStrokeWidth() {
    return this._strokeWidth;
};

Point.prototype.destroy = function destroy() {
    this.element.remove();
    this.handles.remove();
};

Point.prototype.intersectRegion = function intersectRegion(region) {
    var path = this.manager.regionToPath(region, this._zoomFraction * 100);
    var f = this._zoomFraction,
        x = parseInt(this._cx * f, 10),
        y = parseInt(this._cy * f, 10);

    if (Raphael.isPointInsidePath(path, x, y)) {
        return true;
    }
    var path2 = this.getPath(),
        i = Raphael.pathIntersection(path, path2);
    return (i.length > 0);
};

Point.prototype.getPath = function getPath() {

    // Adapted from https://github.com/poilu/raphael-boolean
    var a = this.element.attrs,
        rx = a.rx,
        ry = a.ry,
        cornerPoints = [
            [a.cx - rx, a.cy - ry],
            [a.cx + rx, a.cy - ry],
            [a.cx + rx, a.cy + ry],
            [a.cx - rx, a.cy + ry]
        ],
        path = [];
    var radiusShift = [
        [
            [0, 1],
            [1, 0]
        ],
        [
            [-1, 0],
            [0, 1]
        ],
        [
            [0, -1],
            [-1, 0]
        ],
        [
            [1, 0],
            [0, -1]
        ]
    ];

    //iterate all corners
    for (var i = 0; i <= 3; i++) {
        //insert starting point
        if (i === 0) {
            path.push(["M", cornerPoints[0][0], cornerPoints[0][1] + ry]);
        }

        //insert "curveto" (radius factor .446 is taken from Inkscape)
        var c1 = [cornerPoints[i][0] + radiusShift[i][0][0] * rx * 0.446, cornerPoints[i][1] + radiusShift[i][0][1] * ry * 0.446];
        var c2 = [cornerPoints[i][0] + radiusShift[i][1][0] * rx * 0.446, cornerPoints[i][1] + radiusShift[i][1][1] * ry * 0.446];
        var p2 = [cornerPoints[i][0] + radiusShift[i][1][0] * rx, cornerPoints[i][1] + radiusShift[i][1][1] * ry];
        path.push(["C", c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]]);
    }
    path.push(["Z"]);
    path = path.join(",").replace(/,?([achlmqrstvxz]),?/gi, "$1");

    if (this._rotation !== 0) {
        path = Raphael.transformPath(path, "r" + this._rotation);
    }
    return path;
};

Point.prototype.isSelected = function isSelected() {
    return this._selected;
};

Point.prototype.setZoom = function setZoom(zoom) {
    this._zoomFraction = zoom / 100;
    this.drawShape();
};

Point.prototype.updateHandle = function updateHandle(handleId, x, y) {};

Point.prototype.updateShapeFromHandles = function updateShapeFromHandles(resizeWidth) {};

Point.prototype.drawShape = function drawShape() {

    var strokeColor = this._strokeColor,
        strokeW = this._strokeWidth * this._zoomFraction;

    var f = this._zoomFraction,
        cx = this._cx * f,
        cy = this._cy * f,
        rx = this._rx * f,
        ry = this._ry * f;

    this.element.attr({'cx': cx,
                       'cy': cy,
                       'rx': rx,
                       'ry': ry,
                       'stroke': strokeColor,
                       'fill': strokeColor,
                       'stroke-width': strokeW});
    this.element.transform('r'+ this._rotation);

    if (this.isSelected()) {
        this.element.toFront();
    }
};

Point.prototype.setSelected = function setSelected(selected) {
    this._selected = !!selected;
    this.drawShape();
};

Point.prototype.createHandles = function createHandles() {};

Point.prototype.getHandleCoords = function getHandleCoords() {};

var CreatePoint = function CreatePoint(options) {

    this.paper = options.paper;
    this.manager = options.manager;
    this.radius = options.radius || 10;
};

CreatePoint.prototype.startDrag = function startDrag(startX, startY) {

    var strokeColor = this.manager.getStrokeColor(),
        strokeWidth = this.manager.getStrokeWidth(),
        zoom = this.manager.getZoom();

    this.point = new Point({
        'manager': this.manager,
        'paper': this.paper,
        'cx': startX,
        'cy': startY,
        'r': this.radius,
        'rotation': 0,
        'strokeWidth': strokeWidth,
        'zoom': zoom,
        'strokeColor': strokeColor,
        'fillColor': strokeColor
    });
};

CreatePoint.prototype.drag = function drag(dragX, dragY) {

};

CreatePoint.prototype.stopDrag = function stopDrag() {

    this.point.setSelected(true);
    this.manager.addShape(this.point);
};
