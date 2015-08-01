//! Built on 2015-08-01
//! GPL License. www.openmicroscopy.org

//!  DO NOT EDIT THIS FILE! - Edit under src/js/*.js

/* globals Raphael: false */
/* globals console: false */

var Line = function Line(options) {

    var self = this;
    this.manager = options.manager;
    this.paper = options.paper;

    this._x1 = options.x1;
    this._y1 = options.y1;
    this._x2 = options.x2;
    this._y2 = options.y2;
    this._color = options.color;
    this._lineWidth = options.lineWidth || 2;
    this.handle_wh = 6;
    this._selected = false;
    this._zoomFraction = 1;
    if (options.zoom) {
        this._zoomFraction = options.zoom / 100;
    }

    this.element = this.paper.path();

    // Drag handling of line
    this.element.drag(
        function(dx, dy) {
            // DRAG, update location and redraw
            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;
            self._x1 = this.old.x1 + dx;
            self._y1 = this.old.y1 + dy;
            self._x2 = this.old.x2 + dx;
            self._y2 = this.old.y2 + dy;
            self.drawShape();
            return false;
        },
        function() {
            // START drag: note the location of all points
            self._handleMousedown();
            this.old = {
                'x1': self._x1,
                'x2': self._x2,
                'y1': self._y1,
                'y2': self._y2
            };
            return false;
        },
        function() {
            // STOP
            return false;
        }
    );

    this.createHandles();

    this.drawShape();
};

// handle start of drag by selecting this shape
Line.prototype._handleMousedown = function _handleMousedown() {
    this.manager.selectShape(this);
};

Line.prototype.setCoords = function setCoords(coords) {
    this._x1 = coords.x1 || this._x1;
    this._y1 = coords.y1 || this._y1;
    this._x2 = coords.x2 || this._x2;
    this._y2 = coords.y2 || this._y2;
    this.drawShape();
};

Line.prototype.getCoords = function getCoords() {
    return {'x1': this._x1,
            'y1': this._y1,
            'x2': this._x2,
            'y2': this._y2};
};

Line.prototype.setColor = function setColor(color) {
    this._color = color;
    this.drawShape();
};

Line.prototype.getColor = function getColor() {
    return this._color;
};

Line.prototype.setLineWidth = function setLineWidth(lineWidth) {
    this._lineWidth = lineWidth;
    this.drawShape();
};

Line.prototype.getLineWidth = function getLineWidth() {
    return this._lineWidth;
};

Line.prototype.destroy = function destroy() {
    this.element.remove();
    this.handles.remove();
};

Line.prototype.getPath = function getPath() {
    var f = this._zoomFraction,
        x1 = this._x1 * f,
        y1 = this._y1 * f,
        x2 = this._x2 * f,
        y2 = this._y2 * f;
    return "M" + x1 + " " + y1 + "L" + x2 + " " + y2;
};

Line.prototype.isSelected = function isSelected() {
    return this._selected;
};

Line.prototype.setZoom = function setZoom(zoom) {
    this._zoomFraction = zoom / 100;
    this.drawShape();
};

Line.prototype.drawShape = function drawShape() {

    var p = this.getPath(),
        color = this._color,
        lineW = this._lineWidth;

    this.element.attr({'path': p,
                       'stroke': '#' + color,
                       'fill': '#' + color,
                       'stroke-width': lineW});

    if (this.isSelected()) {
        this.element.toFront();
        this.handles.show().toFront();
    } else {
        this.handles.hide();
    }

    // update Handles
    var handleIds = this.getHandleCoords();
    var hnd, h_id, hx, hy;
    for (var h=0, l=this.handles.length; h<l; h++) {
        hnd = this.handles[h];
        h_id = hnd.h_id;
        hx = handleIds[h_id].x;
        hy = handleIds[h_id].y;
        hnd.attr({'x':hx-this.handle_wh/2, 'y':hy-this.handle_wh/2});
    }
};

Line.prototype.setSelected = function setSelected(selected) {
    this._selected = !!selected;
    this.drawShape();
};


Line.prototype.createHandles = function createHandles() {
    // ---- Create Handles -----

    var self = this,
        // map of centre-points for each handle
        handleIds = this.getHandleCoords(),
        handleAttrs = {'stroke': '#4b80f9',
                        'fill': '#fff',
                        'cursor': 'move',
                        'fill-opacity': 1.0};
    // draw handles
    self.handles = this.paper.set();
    var _handle_drag = function() {
        return function (dx, dy, mouseX, mouseY, event) {

            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;

            // on DRAG...
            if (this.h_id === "start" || this.h_id === "middle") {
                self._x1 = this.old.x1 + dx;
                self._y1 = this.old.y1 + dy;
            }
            if (this.h_id === "end" || this.h_id === "middle") {
                self._x2 = this.old.x2 + dx;
                self._y2 = this.old.y2 + dy;
            }
            self.drawShape();
            return false;
        };
    };
    var _handle_drag_start = function() {
        return function () {
            // START drag: cache the starting coords of the line
            this.old = {
                'x1': self._x1,
                'x2': self._x2,
                'y1': self._y1,
                'y2': self._y2
            };
            return false;
        };
    };
    var _handle_drag_end = function() {
        return function() {
            return false;
        };
    };

    var hsize = this.handle_wh,
        hx, hy, handle;
    for (var key in handleIds) {
        hx = handleIds[key].x;
        hy = handleIds[key].y;
        handle = this.paper.rect(hx-hsize/2, hy-hsize/2, hsize, hsize);
        handle.attr({'cursor': 'move'});
        handle.h_id = key;
        handle.line = self;

        handle.drag(
            _handle_drag(),
            _handle_drag_start(),
            _handle_drag_end()
        );
        self.handles.push(handle);
    }
    self.handles.attr(handleAttrs).hide();     // show on selection
};

Line.prototype.getHandleCoords = function getHandleCoords() {
    var f = this._zoomFraction,
        x1 = this._x1 * f,
        y1 = this._y1 * f,
        x2 = this._x2 * f,
        y2 = this._y2 * f;
    return {'start': {x: x1, y: y1},
        'middle': {x: (x1+x2)/2, y: (y1+y2)/2},
        'end': {x: x2, y: y2}
    };
};



var Arrow = function Arrow(options) {

    var that = new Line(options);

    that.getPath = function getPath() {

        var zf = this._zoomFraction,
            x1 = this._x1 * zf,
            y1 = this._y1 * zf,
            x2 = this._x2 * zf,
            y2 = this._y2 * zf;

        var headSize = (this._lineWidth * 3) + 9,
            dx = x2 - x1,
            dy = y2 - y1;


        var linePath = "M" + x1 + " " + y1 + "L" + x2 + " " + y2;
        var lineAngle = Math.atan(dx / dy);
        var f = (dy < 0 ? 1 : -1);

        // Angle of arrow head is 0.8 radians (0.4 either side of lineAngle)
        var arrowPoint1x = x2 + (f * Math.sin(lineAngle - 0.4) * headSize),
            arrowPoint1y = y2 + (f * Math.cos(lineAngle - 0.4) * headSize),
            arrowPoint2x = x2 + (f * Math.sin(lineAngle + 0.4) * headSize),
            arrowPoint2y = y2 + (f * Math.cos(lineAngle + 0.4) * headSize);

        // Full path goes around the head, past the tip and back to tip so that the tip is 'pointy'
        // and 'fill' is not from a head corner to the start of arrow.
        var arrowPath = linePath + "L" + arrowPoint1x + " " + arrowPoint1y + "L" + arrowPoint2x + " " + arrowPoint2y;
        arrowPath = arrowPath + "L" + x2 + " " + y2 + "L" + arrowPoint1x + " " + arrowPoint1y + "L" + x2 + " " + y2;
        return arrowPath;
    };

    return that;
};



// Class for creating Lines.
var CreateLine = function CreateLine(options) {

    this.paper = options.paper;
    this.manager = options.manager;
};

CreateLine.prototype.startDrag = function startDrag(startX, startY) {

    var color = this.manager.getColor(),
        lineWidth = this.manager.getLineWidth(),
        zoom = this.manager.getZoom();

    this.line = new Line({
        'manager': this.manager,
        'paper': this.paper,
        'x1': startX,
        'y1': startY,
        'x2': startX,
        'y2': startY,
        'lineWidth': lineWidth,
        'zoom': zoom,
        'color': color});
};

CreateLine.prototype.drag = function drag(dragX, dragY) {

    this.line.setCoords({'x2': dragX, 'y2': dragY});
};

CreateLine.prototype.stopDrag = function stopDrag() {

    var coords = this.line.getCoords();
    if ((Math.abs(coords.x1 - coords.x2) < 2) &&
            (Math.abs(coords.y1 - coords.y2) < 2)) {
        this.line.destroy();
        delete this.line;
        return;
    }
    this.line.setSelected(true);
    this.manager.addShape(this.line);
};


var CreateArrow = function CreateArrow(options) {

    var that = new CreateLine(options);

    that.startDrag = function startDrag(startX, startY) {
        var color = this.manager.getColor(),
            lineWidth = this.manager.getLineWidth(),
            zoom = this.manager.getZoom();

        this.line = new Arrow({
            'manager': this.manager,
            'paper': this.paper,
            'x1': startX,
            'y1': startY,
            'x2': startX,
            'y2': startY,
            'lineWidth': lineWidth,
            'zoom': zoom,
            'color': color});
    };

    return that;
};

/* globals Raphael: false */
/* globals console: false */

var Rect = function Rect(options) {

    var self = this;
    this.paper = options.paper;
    this.manager = options.manager;

    this._x = options.x;
    this._y = options.y;
    this._width = options.width;
    this._height = options.height;
    this._color = options.color;
    this._lineWidth = options.lineWidth || 2;
    this._selected = false;
    this._zoomFraction = 1;
    if (options.zoom) {
        this._zoomFraction = options.zoom / 100;
    }
    this.handle_wh = 6;

    this.element = this.paper.rect();
    this.element.attr({'fill-opacity': 0.01, 'fill': '#fff'});

    // Drag handling of element
    this.element.drag(
        function(dx, dy) {
            // DRAG, update location and redraw
            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;
            self._x = dx+this.ox;
            self._y = this.oy+dy;
            self.drawShape();
            return false;
        },
        function() {
            self._handleMousedown();
            // START drag: note the location of this handle
            this.ox = this.attr('x') / self._zoomFraction;
            this.oy = this.attr('y') / self._zoomFraction;
            return false;
        },
        function() {
            // STOP
            return false;
        }
    );

    this.createHandles();

    this.drawShape();
};

// handle start of drag by selecting this shape
Rect.prototype._handleMousedown = function _handleMousedown() {
    this.manager.selectShape(this);
};

Rect.prototype.setSelected = function setSelected(selected) {
    this._selected = !!selected;
    this.drawShape();
};

Rect.prototype.isSelected = function isSelected() {
    return this._selected;
};

Rect.prototype.setZoom = function setZoom(zoom) {
    this._zoomFraction = zoom / 100;
    this.drawShape();
};

Rect.prototype.setCoords = function setCoords(coords) {
    this._x = coords.x || this._x;
    this._y = coords.y || this._y;
    this._width = coords.width || this._width;
    this._height = coords.height || this._height;
    this.drawShape();
};

Rect.prototype.getCoords = function getCoords() {
    return {'x': this._x,
            'y': this._y,
            'width': this._width,
            'height': this._height};
};

Rect.prototype.setColor = function setColor(color) {
    this._color = color;
    this.drawShape();
};

Rect.prototype.getColor = function getColor() {
    return this._color;
};

Rect.prototype.setLineWidth = function setLineWidth(lineWidth) {
    this._lineWidth = lineWidth;
    this.drawShape();
};

Rect.prototype.getLineWidth = function getLineWidth() {
    return this._lineWidth;
};

Rect.prototype.destroy = function destroy() {
    this.element.remove();
    this.handles.remove();
};

Rect.prototype.drawShape = function drawShape() {

    var color = this._color,
        lineW = this._lineWidth;

    var f = this._zoomFraction,
        x = this._x * f,
        y = this._y * f,
        w = this._width * f,
        h = this._height * f;

    this.element.attr({'x':x, 'y':y,
                       'width':w, 'height':h,
                       'stroke': '#' + color,
                       'stroke-width': lineW});

    if (this.isSelected()) {
        this.element.toFront();
        this.handles.show().toFront();
    } else {
        this.handles.hide();
    }

    // update Handles
    var handleIds = this.getHandleCoords();
    var hnd, h_id, hx, hy;
    for (var i=0, l=this.handles.length; i<l; i++) {
        hnd = this.handles[i];
        h_id = hnd.h_id;
        hx = handleIds[h_id][0];
        hy = handleIds[h_id][1];
        hnd.attr({'x':hx-this.handle_wh/2, 'y':hy-this.handle_wh/2});
    }
};

Rect.prototype.getHandleCoords = function getHandleCoords() {

    var f = this._zoomFraction,
        x = this._x * f,
        y = this._y * f,
        w = this._width * f,
        h = this._height * f;

    var handleIds = {'nw': [x, y],
        'n': [x + w/2,y],
        'ne': [x + w,y],
        'w': [x, y + h/2],
        'e': [x + w, y + h/2],
        'sw': [x, y + h],
        's': [x + w/2, y + h],
        'se': [x + w, y + h]};
    return handleIds;
};

// ---- Create Handles -----
Rect.prototype.createHandles = function createHandles() {

    var self = this,
        handle_attrs = {'stroke': '#4b80f9',
                        'fill': '#fff',
                        'cursor': 'default',
                        'fill-opacity': 1.0};

    // map of centre-points for each handle
    var handleIds = this.getHandleCoords();

    // draw handles
    self.handles = this.paper.set();
    var _handle_drag = function() {
        return function (dx, dy, mouseX, mouseY, event) {

            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;

            // If drag on corner handle, retain aspect ratio. dx/dy = aspect
            var keep_ratio = self.fixed_ratio || event.shiftKey;
            if (keep_ratio && this.h_id.length === 2) {     // E.g. handle is corner 'ne' etc
                if (this.h_id === 'se' || this.h_id === 'nw') {
                    if (Math.abs(dx/dy) > this.aspect) {
                        dy = dx/this.aspect;
                    } else {
                        dx = dy*this.aspect;
                    }
                } else {
                    if (Math.abs(dx/dy) > this.aspect) {
                        dy = -dx/this.aspect;
                    } else {
                        dx = -dy*this.aspect;
                    }
                }
            }
            // Use dx & dy to update the location of the handle and the corresponding point of the parent
            var new_x = this.ox + dx;
            var new_y = this.oy + dy;
            var newRect = {
                x: self._x,
                y: self._y,
                width: self._width,
                height: self._height
            };
            if (this.h_id.indexOf('e') > -1) {    // if we're dragging an 'EAST' handle, update width
                newRect.width = new_x - self._x + self.handle_wh/2;
            }
            if (this.h_id.indexOf('s') > -1) {    // if we're dragging an 'SOUTH' handle, update height
                newRect.height = new_y - self._y + self.handle_wh/2;
            }
            if (this.h_id.indexOf('n') > -1) {    // if we're dragging an 'NORTH' handle, update y and height
                newRect.y = new_y + self.handle_wh/2;
                newRect.height = this.oheight - dy;
            }
            if (this.h_id.indexOf('w') > -1) {    // if we're dragging an 'WEST' handle, update x and width
                newRect.x = new_x + self.handle_wh/2;
                newRect.width = this.owidth - dx;
            }
            // Don't allow zero sized rect.
            if (newRect.width < 1 || newRect.height < 1) {
                return false;
            }

            self._x = newRect.x;
            self._y = newRect.y;
            self._width = newRect.width;
            self._height = newRect.height;
            self.drawShape();
            return false;
        };
    };
    var _handle_drag_start = function() {
        return function () {
            // START drag: simply note the location we started
            this.ox = this.attr("x") / self._zoomFraction;
            this.oy = this.attr("y") / self._zoomFraction;
            this.owidth = self._width;
            this.oheight = self._height;
            this.aspect = self._width / self._height;
            return false;
        };
    };
    var _handle_drag_end = function() {
        return function() {
            return false;
        };
    };
    // var _stop_event_propagation = function(e) {
    //     e.stopImmediatePropagation();
    // }
    for (var key in handleIds) {
        var hx = handleIds[key][0];
        var hy = handleIds[key][1];
        var handle = this.paper.rect(hx-self.handle_wh/2, hy-self.handle_wh/2, self.handle_wh, self.handle_wh).attr(handle_attrs);
        handle.attr({'cursor': key + '-resize'});     // css, E.g. ne-resize
        handle.h_id = key;
        handle.rect = self;

        handle.drag(
            _handle_drag(),
            _handle_drag_start(),
            _handle_drag_end()
        );
        // handle.mousedown(_stop_event_propagation);
        self.handles.push(handle);
    }
    self.handles.hide();     // show on selection
};



// Class for creating Lines.
var CreateRect = function CreateRect(options) {

    this.paper = options.paper;
    this.manager = options.manager;
};

CreateRect.prototype.startDrag = function startDrag(startX, startY) {

    var color = this.manager.getColor(),
        lineWidth = this.manager.getLineWidth(),
        zoom = this.manager.getZoom();
    // Also need to get lineWidth and zoom/size etc.

    this.startX = startX;
    this.startY = startY;

    this.rect = new Rect({
        'manager': this.manager,
        'paper': this.paper,
        'x': startX,
        'y': startY,
        'width': 0,
        'height': 0,
        'lineWidth': lineWidth,
        'zoom': zoom,
        'color': color});
};

CreateRect.prototype.drag = function drag(dragX, dragY) {

    var dx = this.startX - dragX,
        dy = this.startY - dragY;

    this.rect.setCoords({'x': Math.min(dragX, this.startX),
                        'y': Math.min(dragY, this.startY),
                        'width': Math.abs(dx), 'height': Math.abs(dy)});
};

CreateRect.prototype.stopDrag = function stopDrag() {

    var coords = this.rect.getCoords();
    if (coords.width < 2 || coords.height < 2) {
        this.rect.destroy();
        delete this.rect;
        return;
    }
    this.rect.setSelected(true);
    this.manager.addShape(this.rect);
};

/* globals Raphael: false */
/* globals console: false */

var Ellipse = function Ellipse(options) {

    var self = this;
    this.manager = options.manager;
    this.paper = options.paper;

    this._cx = options.cx;
    this._cy = options.cy;
    this._rx = options.rx;
    this._ry = options.ry;
    this._rotation = options.rotation || 0;

    this._color = options.color;
    this._lineWidth = options.lineWidth || 2;
    this._selected = false;
    this._zoomFraction = 1;
    if (options.zoom) {
        this._zoomFraction = options.zoom / 100;
    }
    this.handle_wh = 6;

    this.element = this.paper.ellipse();
    this.element.attr({'fill-opacity': 0.01, 'fill': '#fff'});

    // Drag handling of ellipse
    this.element.drag(
        function(dx, dy) {
            // DRAG, update location and redraw
            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;
            self._cx = dx+this.ox;
            self._cy = this.oy+dy;
            self.drawShape();
            return false;
        },
        function() {
            // START drag: note the start location
            self._handleMousedown();
            this.ox = self._cx;
            this.oy = self._cy;
            return false;
        },
        function() {
            // STOP
            return false;
        }
    );

    this.createHandles();

    this.drawShape();
};

// handle start of drag by selecting this shape
Ellipse.prototype._handleMousedown = function _handleMousedown() {
    this.manager.selectShape(this);
};

// Ellipse.prototype.setCoords = function setCoords(coords) {
//     this._x1 = coords.x1 || this._x1;
//     this._y1 = coords.y1 || this._y1;
//     this._x2 = coords.x2 || this._x2;
//     this._y2 = coords.y2 || this._y2;
//     this.drawShape();
// };

// Ellipse.prototype.getCoords = function getCoords() {
//     return {'x1': this._x1,
//             'y1': this._y1,
//             'x2': this._x2,
//             'y2': this._y2};
// };

Ellipse.prototype.setColor = function setColor(color) {
    this._color = color;
    this.drawShape();
};

Ellipse.prototype.getColor = function getColor() {
    return this._color;
};

Ellipse.prototype.setLineWidth = function setLineWidth(lineWidth) {
    this._lineWidth = lineWidth;
    this.drawShape();
};

Ellipse.prototype.getLineWidth = function getLineWidth() {
    return this._lineWidth;
};

Ellipse.prototype.destroy = function destroy() {
    this.element.remove();
    this.handles.remove();
};

// Ellipse.prototype.getPath = function getPath() {
//     return "M" + this._x1 + " " + this._y1 + "L" + this._x2 + " " + this._y2;
// };

Ellipse.prototype.isSelected = function isSelected() {
    return this._selected;
};

Ellipse.prototype.setZoom = function setZoom(zoom) {
    this._zoomFraction = zoom / 100;
    this.drawShape();
};

Ellipse.prototype.updateHandle = function updateHandle(handleId, x, y) {
    // Refresh the handle coordinates, then update the specified handle
    // using MODEL coordinates
    this._handleIds = this.getHandleCoords();
    var h = this._handleIds[handleId];
    h.x = x;
    h.y = y;
    this.updateShapeFromHandles();
};

Ellipse.prototype.updateShapeFromHandles = function updateShapeFromHandles() {
    var hh = this._handleIds,
        lengthX = hh.end.x - hh.start.x,
        lengthY = hh.end.y - hh.start.y,
        widthX = hh.left.x - hh.right.x,
        widthY = hh.left.y - hh.right.y,
        rot;
    if (lengthX === 0){
        this._rotation = 90;
    } else if (lengthX > 0) {
        rot = Math.atan(lengthY / lengthX);
        this._rotation = Raphael.deg(rot);
    } else if (lengthX < 0) {
        rot = Math.atan(lengthY / lengthX);
        this._rotation = 180 + Raphael.deg(rot);
    }
    
    this._cx = (hh.start.x + hh.end.x)/2,
    this._cy = (hh.start.y + hh.end.y)/2,
    this._rx = Math.sqrt((lengthX * lengthX) + (lengthY * lengthY)) / 2,
    this._ry = Math.sqrt((widthX * widthX) + (widthY * widthY)) / 2,

    this.drawShape();
};

Ellipse.prototype.drawShape = function drawShape() {

    var color = this._color,
        lineW = this._lineWidth;

    var f = this._zoomFraction,
        cx = this._cx * f,
        cy = this._cy * f,
        rx = this._rx * f,
        ry = this._ry * f;

    this.element.attr({'cx': cx,
                       'cy': cy,
                       'rx': rx,
                       'ry': ry,
                       'stroke': '#' + color,
                       'stroke-width': lineW});
    this.element.transform('r'+ this._rotation);

    if (this.isSelected()) {
        this.element.toFront();
        this.handles.show().toFront();
    } else {
        this.handles.hide();
    }

    // handles have been updated (model coords)
    this._handleIds = this.getHandleCoords();
    var hnd, h_id, hx, hy;
    for (var h=0, l=this.handles.length; h<l; h++) {
        hnd = this.handles[h];
        h_id = hnd.h_id;
        hx = this._handleIds[h_id].x * this._zoomFraction;
        hy = this._handleIds[h_id].y * this._zoomFraction;
        hnd.attr({'x':hx-this.handle_wh/2, 'y':hy-this.handle_wh/2});
    }
};

Ellipse.prototype.setSelected = function setSelected(selected) {
    this._selected = !!selected;
    this.drawShape();
};


Ellipse.prototype.createHandles = function createHandles() {
    // ---- Create Handles -----

    // NB: handleIds are used to calculate ellipse coords
    // so handledIds are scaled to MODEL coords, not zoomed.
    this._handleIds = this.getHandleCoords();

    var self = this,
        // map of centre-points for each handle
        handleAttrs = {'stroke': '#4b80f9',
                        'fill': '#fff',
                        'cursor': 'move',
                        'fill-opacity': 1.0};

    // draw handles
    self.handles = this.paper.set();
    var _handle_drag = function() {
        return function (dx, dy, mouseX, mouseY, event) {
            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;
            // on DRAG...
            var absX = dx + this.ox,
                absY = dy + this.oy;
            self.updateHandle(this.h_id, absX, absY);
            return false;
        };
    };
    var _handle_drag_start = function() {
        return function () {
            // START drag: simply note the location we started
            // we scale by zoom to get the 'model' coordinates
            this.ox = (this.attr("x") + this.attr('width')/2) / self._zoomFraction;
            this.oy = (this.attr("y") + this.attr('height')/2) / self._zoomFraction;
            return false;
        };
    };
    var _handle_drag_end = function() {
        return function() {
            return false;
        };
    };

    var hsize = this.handle_wh,
        hx, hy, handle;
    for (var key in this._handleIds) {
        hx = this._handleIds[key].x;
        hy = this._handleIds[key].y;
        handle = this.paper.rect(hx-hsize/2, hy-hsize/2, hsize, hsize);
        handle.attr({'cursor': 'move'});
        handle.h_id = key;
        handle.line = self;

        handle.drag(
            _handle_drag(),
            _handle_drag_start(),
            _handle_drag_end()
        );
        self.handles.push(handle);
    }

    self.handles.attr(handleAttrs).hide();     // show on selection
};

Ellipse.prototype.getHandleCoords = function getHandleCoords() {
    // Returns MODEL coordinates (not zoom coordinates)
    var rot = Raphael.rad(this._rotation),
        cx = this._cx,
        cy = this._cy,
        rx = this._rx,
        ry = this._ry,
        startX = cx - (Math.cos(rot) * rx),
        startY = cy - (Math.sin(rot) * rx),
        endX = cx + (Math.cos(rot) * rx),
        endY = cy + (Math.sin(rot) * rx),
        leftX = cx + (Math.sin(rot) * ry),
        leftY = cy - (Math.cos(rot) * ry),
        rightX = cx - (Math.sin(rot) * ry),
        rightY = cy + (Math.cos(rot) * ry);

    return {'start':{x: startX, y: startY},
            'end':{x: endX, y: endY},
            'left':{x: leftX, y: leftY},
            'right':{x: rightX, y: rightY}
        };
};


// Class for creating Lines.
var CreateEllipse = function CreateEllipse(options) {

    this.paper = options.paper;
    this.manager = options.manager;
};

CreateEllipse.prototype.startDrag = function startDrag(startX, startY) {

    var color = this.manager.getColor(),
        lineWidth = this.manager.getLineWidth(),
        zoom = this.manager.getZoom();

    this.ellipse = new Ellipse({
        'manager': this.manager,
        'paper': this.paper,
        'cx': startX,
        'cy': startY,
        'rx': 0,
        'ry': 50,
        'rotation': 0,
        'lineWidth': lineWidth,
        'zoom': zoom,
        'color': color});
};

CreateEllipse.prototype.drag = function drag(dragX, dragY) {

    this.ellipse.updateHandle('end', dragX, dragY);
};

CreateEllipse.prototype.stopDrag = function stopDrag() {

    // var coords = this.ellipse.getCoords();
    // if ((Math.abs(coords.x1 - coords.x2) < 2) &&
    //         (Math.abs(coords.y1 - coords.y2) < 2)) {
    //     this.line.destroy();
    //     delete this.line;
    //     return;
    // }
    this.ellipse.setSelected(true);
    this.manager.addShape(this.ellipse);
};

/* globals Raphael: false */
/* globals CreateRect: false */
/* globals CreateLine: false */
/* globals CreateArrow: false */
/* globals CreateEllipse: false */
/* globals console: false */

var ShapeManager = function ShapeManager(elementId, width, height, options) {

    var self = this;

    // Keep track of state, color etc
    this.STATES = ["SELECT", "RECT", "LINE", "ARROW", "ELLIPSE"];
    this._state = "SELECT";
    this._color = "ff0000";
    this._lineWidth = 2;
    this._orig_width = width;
    this._orig_height = height;
    this._zoom = 100;

    // Set up Raphael paper...
    this.paper = Raphael(elementId, width, height);

    // jQuery element used for .offset() etc.
    this.$el = $("#" + elementId);

    // Store all the shapes we create
    this._shapes = [];

    // Add a full-size background to cover existing shapes while
    // we're creating new shapes, to stop them being selected.
    // Mouse events on this will bubble up to svg and are handled below
    this.newShapeBg = this.paper.rect(0, 0, width, height);
    this.newShapeBg.attr({'fill':'#000',
                          'fill-opacity':0.01,
                          'cursor': 'crosshair'});
    this.newShapeBg.drag(
        function(){
            self.drag.apply(self, arguments);
        },
        function(){
            self.startDrag.apply(self, arguments);
        },
        function(){
            self.stopDrag.apply(self, arguments);
        });

    this.shapeFactories = {
        "RECT": new CreateRect({'manager': this, 'paper': this.paper}),
        "ELLIPSE": new CreateEllipse({'manager': this, 'paper': this.paper}),
        "LINE": new CreateLine({'manager': this, 'paper': this.paper}),
        "ARROW": new CreateArrow({'manager': this, 'paper': this.paper})
    };

    this.createShape = this.shapeFactories.LINE;
};

ShapeManager.prototype.startDrag = function startDrag(x, y, event){
    // clear any existing selected shapes
    this.clearSelected();

    // create a new shape with X and Y
    // createShape helper can get other details itself
    var offset = this.$el.offset(),
        startX = x - offset.left,
        startY = y - offset.top;

    // correct for zoom before passing coordinates to shape
    var zoomFraction = this._zoom / 100;
    startX = startX / zoomFraction;
    startY = startY / zoomFraction;
    this.createShape.startDrag(startX, startY);

    // Move this in front of new shape so that drag events don't get lost to the new shape
    this.newShapeBg.toFront();
};

ShapeManager.prototype.drag = function drag(dx, dy, x, y, event){
    var offset = this.$el.offset(),
        dragX = x - offset.left,
        dragY = y - offset.top;

    // correct for zoom before passing coordinates to shape
    var zoomFraction = this._zoom / 100;
    dragX = dragX / zoomFraction;
    dragY = dragY / zoomFraction;
    this.createShape.drag(dragX, dragY);
}; 

ShapeManager.prototype.stopDrag = function stopDrag(){
    this.createShape.stopDrag();
};

ShapeManager.prototype.setState = function setState(state) {
    if (this.STATES.indexOf(state) === -1) {
        console.log("Invalid state: ", state, "Needs to be in", this.STATES);
        return;
    }
    // When creating shapes, cover existing shapes with newShapeBg
    var shapes = ["RECT", "LINE", "ARROW", "ELLIPSE"];
    if (shapes.indexOf(state) > -1) {
        this.newShapeBg.show().toFront();
        // clear selected shapes
        this.clearSelected();

        if (this.shapeFactories[state]) {
            this.createShape = this.shapeFactories[state];
        }
    } else {
        this.newShapeBg.hide();
    }

    this._state = state;
};

ShapeManager.prototype.getState = function getState() {
    return this._state;
};

ShapeManager.prototype.setZoom = function setZoom(zoomPercent) {
    // var zoom = this.shapeEditor.get('zoom');

    // var $imgWrapper = $(".image_wrapper"),
    //     currWidth = $imgWrapper.width(),
    //     currHeight = $imgWrapper.height(),
    //     currTop = parseInt($imgWrapper.css('top'), 10),
    //     currLeft = parseInt($imgWrapper.css('left'), 10);

    // var width = 512 * zoom / 100,
    //     height = 512 * zoom / 100;
    // $("#shapeCanvas").css({'width': width + "px", 'height': height + "px"});

    this._zoom = zoomPercent;
    // Update the svg and our newShapeBg.
    // $("svg").css({'width': width + "px", 'height': height + "px"});
    var width = this._orig_width * zoomPercent / 100,
        height = this._orig_height * zoomPercent / 100;
    this.paper.setSize(width, height);
    this.paper.canvas.setAttribute("viewBox", "0 0 "+width+" "+height);
    this.newShapeBg.attr({'width': width, 'height': height});

    // zoom the shapes
    this._shapes.forEach(function(shape){
        shape.setZoom(zoomPercent);
    });

    // // image 
    // $(".image_wrapper").css({'width': width + "px", 'height': height + "px"});
    // // offset
    // var deltaTop = (height - currHeight) / 2,
    //     deltaLeft = (width - currWidth) / 2;
    // $(".image_wrapper").css({'left': (currLeft - deltaLeft) + "px",
    //                          'top': (currTop - deltaTop) + "px"});
};

ShapeManager.prototype.getZoom = function getZoom(zoomPercent) {
    return this._zoom;
};

ShapeManager.prototype.setColor = function setColor(color) {
    this._color = color;
    var selected = this.getSelected();
    for (var s=0; s<selected.length; s++) {
        selected[s].setColor(color);
    }
};

ShapeManager.prototype.getColor = function getColor() {
    return this._color;
};

ShapeManager.prototype.setLineWidth = function setLineWidth(lineWidth) {
    lineWidth = parseInt(lineWidth, 10);
    this._lineWidth = lineWidth;
    var selected = this.getSelected();
    for (var s=0; s<selected.length; s++) {
        selected[s].setLineWidth(lineWidth);
    }
};

ShapeManager.prototype.getLineWidth = function getLineWidth() {
    return this._lineWidth;
};

ShapeManager.prototype.addShape = function addShape(shape) {
    this._shapes.push(shape);
};

ShapeManager.prototype.getSelected = function getSelected() {
    var selected = [];
    for (var i=0; i<this._shapes.length; i++) {
        if (this._shapes[i].isSelected()) {
            selected.push(this._shapes[i]);
        }
    }
    return selected;
};

ShapeManager.prototype.clearSelected = function clearSelected() {
    for (var i=0; i<this._shapes.length; i++) {
        this._shapes[i].setSelected(false);
    }
};

ShapeManager.prototype.selectShape = function selectShape(shape) {
    this.clearSelected();
    shape.setSelected(true);
    this._color = shape.getColor();
    this._lineWidth = shape.getLineWidth();
    this.$el.trigger("change:selected");
};
