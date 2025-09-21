var Input = {
    keys: [],
    mouse: {
        left: false,
        right: false,
        middle: false,
        x: 0,
        y: 0
    }
};
for (var i = 0; i < 230; i++) {
    Input.keys.push(false);
}
document.addEventListener("keydown", function(event) {
    Input.keys[event.keyCode] = true;
});
document.addEventListener("keyup", function(event) {
    Input.keys[event.keyCode] = false;
});
document.addEventListener("mousedown", function(event) {
    if ((event.button = 0)) {
        Input.mouse.left = true;
    }
    if ((event.button = 1)) {
        Input.mouse.middle = true;
    }
    if ((event.button = 2)) {
        Input.mouse.right = true;
    }
});
document.addEventListener("mouseup", function(event) {
    if ((event.button = 0)) {
        Input.mouse.left = false;
    }
    if ((event.button = 1)) {
        Input.mouse.middle = false;
    }
    if ((event.button = 2)) {
        Input.mouse.right = false;
    }
});
document.addEventListener("mousemove", function(event) {
    Input.mouse.x = event.clientX;
    Input.mouse.y = event.clientY;
});
document.addEventListener("touchstart", function(event) {
    Input.mouse.left = true;
    Input.mouse.x = event.touches[0].clientX;
    Input.mouse.y = event.touches[0].clientY;
});
document.addEventListener("touchend", function(event) {
    Input.mouse.left = false;
});
document.addEventListener("touchmove", function(event) {
    Input.mouse.x = event.touches[0].clientX;
    Input.mouse.y = event.touches[0].clientY;
});
//Sets up canvas
var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = Math.max(window.innerWidth, window.innerWidth);

canvas.height = window.innerHeight;
canvas.style.position = "absolute";
canvas.style.left = "0px";
canvas.style.top = "0px";
document.body.style.overflow = "hidden";
var ctx = canvas.getContext("2d");

// Game state variables
let score = 0;
let gameOver = false;
let startTime = Date.now();
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const restartButton = document.getElementById('restartButton');

//Necessary classes
var segmentCount = 0;
class Segment {
    constructor(parent, size, angle, range, stiffness) {
        segmentCount++;
        this.isSegment = true;
        this.parent = parent; //Segment which this one is connected to
        if (typeof parent.children == "object") {
            parent.children.push(this);
        }
        this.children = []; //Segments connected to this segment
        this.size = size; //Distance from parent
        this.relAngle = angle; //Angle relative to parent
        this.defAngle = angle; //Default angle relative to parent
        this.absAngle = parent.absAngle + angle; //Angle relative to x-axis
        this.range = range; //Difference between maximum and minimum angles
        this.stiffness = stiffness; //How closely it conforms to default angle
        this.updateRelative(false, true);
    }
    updateRelative(iter, flex) {
        this.relAngle =
            this.relAngle -
            2 *
            Math.PI *
            Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
        if (flex) {
            this.relAngle = Math.min(
                this.defAngle + this.range / 2,
                Math.max(
                    this.defAngle - this.range / 2,
                    (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
                )
            );
        }
        this.absAngle = this.parent.absAngle + this.relAngle;
        this.x = this.parent.x + Math.cos(this.absAngle) * this.size; //Position
        this.y = this.parent.y + Math.sin(this.absAngle) * this.size; //Position
        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].updateRelative(iter, flex);
            }
        }
    }
    draw(iter) {
        ctx.beginPath();
        ctx.moveTo(this.parent.x, this.parent.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].draw(true);
            }
        }
    }
    follow(iter) {
        var x = this.parent.x;
        var y = this.parent.y;
        var dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
        this.x = x + this.size * (this.x - x) / dist;
        this.y = y + this.size * (this.y - y) / dist;
        this.absAngle = Math.atan2(this.y - y, this.x - x);
        this.relAngle = this.absAngle - this.parent.absAngle;
        this.updateRelative(false, true);
        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].follow(true);
            }
        }
    }
}
class LimbSystem {
    constructor(end, length, speed, creature) {
        this.end = end;
        this.length = Math.max(1, length);
        this.creature = creature;
        this.speed = speed;
        creature.systems.push(this);
        this.nodes = [];
        var node = end;
        for (var i = 0; i < length; i++) {
            this.nodes.unshift(node);
            node = node.parent;
            if (!node.isSegment) {
                this.length = i + 1;
                break;
            }
        }
        this.hip = this.nodes[0].parent;
    }
    moveTo(x, y) {
        this.nodes[0].updateRelative(true, true);
        var dist = ((x - this.end.x) ** 2 + (y - this.end.y) ** 2) ** 0.5;
        var len = Math.max(0, dist - this.speed);
        for (var i = this.nodes.length - 1; i >= 0; i--) {
            var node = this.nodes[i];
            var ang = Math.atan2(node.y - y, node.x - x);
            node.x = x + len * Math.cos(ang);
            node.y = y + len * Math.sin(ang);
            x = node.x;
            y = node.y;
            len = node.size;
        }
        for (var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            node.absAngle = Math.atan2(
                node.y - node.parent.y,
                node.x - node.parent.x
            );
            node.relAngle = node.absAngle - node.parent.absAngle;
            for (var ii = 0; ii < node.children.length; ii++) {
                var childNode = node.children[ii];
                if (!this.nodes.includes(childNode)) {
                    childNode.updateRelative(true, false);
                }
            }
        }
    }
    update() {
        this.moveTo(Input.mouse.x, Input.mouse.y);
    }
}
class LegSystem extends LimbSystem {
    constructor(end, length, speed, creature) {
        super(end, length, speed, creature);
        this.goalX = end.x;
        this.goalY = end.y;
        this.step = 0; //0 stand still, 1 move forward,2 move towards foothold
        this.forwardness = 0;

        this.reach =
            0.9 *
            ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) ** 0.5;
        var relAngle =
            this.creature.absAngle -
            Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
        relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
        this.swing = -relAngle + (2 * (relAngle < 0) - 1) * Math.PI / 2;
        this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    }
    update(x, y) {
        this.moveTo(this.goalX, this.goalY);
        if (this.step == 0) {
            var dist =
                ((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2) **
                0.5;
            if (dist > 1) {
                this.step = 1;
                this.goalX =
                    this.hip.x +
                    this.reach *
                    Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
                    (2 * Math.random() - 1) * this.reach / 2;
                this.goalY =
                    this.hip.y +
                    this.reach *
                    Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
                    (2 * Math.random() - 1) * this.reach / 2;
            }
        } else if (this.step == 1) {
            var theta =
                Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) -
                this.hip.absAngle;
            var dist =
                ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) **
                0.5;
            var forwardness2 = dist * Math.cos(theta);
            var dF = this.forwardness - forwardness2;
            this.forwardness = forwardness2;
            if (dF * dF < 1) {
                this.step = 0;
                this.goalX = this.hip.x + (this.end.x - this.hip.x);
                this.goalY = this.hip.y + (this.end.y - this.hip.y);
            }
        }
    }
}
class Creature {
    constructor(
        type, x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh
    ) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.absAngle = angle;
        this.fSpeed = 0;
        this.fAccel = fAccel;
        this.fFric = fFric;
        this.fRes = fRes;
        this.fThresh = fThresh;
        this.rSpeed = 0;
        this.rAccel = rAccel;
        this.rFric = rFric;
        this.rRes = rRes;
        this.rThresh = rThresh;
        this.children = [];
        this.systems = [];
        this.wanderTargetX = x;
        this.wanderTargetY = y;
        this.wanderTimer = 0;
    }
    follow(x, y, flee = false) {
        var dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
        var angle = Math.atan2(y - this.y, x - this.x);
        if (flee) {
            angle += Math.PI;
        }
        //Update forward
        var accel = this.fAccel;
        if (this.systems.length > 0) {
            var sum = 0;
            for (var i = 0; i < this.systems.length; i++) {
                sum += this.systems[i].step == 0;
            }
            accel *= sum / this.systems.length;
        }
        this.fSpeed += accel * (dist > this.fThresh);
        this.fSpeed *= 1 - this.fRes;
        this.speed = Math.max(0, this.fSpeed - this.fFric);
        //Update rotation
        var dif = this.absAngle - angle;
        dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);
        if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
            this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
        }
        this.rSpeed *= 1 - this.rRes;
        if (Math.abs(this.rSpeed) > this.rFric) {
            this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1);
        } else {
            this.rSpeed = 0;
        }

        //Update position
        this.absAngle += this.rSpeed;
        this.absAngle -=
            2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
        this.x += this.speed * Math.cos(this.absAngle);
        this.y += this.speed * Math.sin(this.absAngle);


        this.absAngle += Math.PI;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].follow(true, true);
        }
        for (var i = 0; i < this.systems.length; i++) {
            this.systems[i].update(x, y);
        }
        this.absAngle -= Math.PI;
    }

    wander() {
        this.wanderTimer--;
        if (this.wanderTimer <= 0) {
            this.wanderTargetX = Math.random() * canvas.width;
            this.wanderTargetY = Math.random() * canvas.height;
            this.wanderTimer = Math.random() * 120 + 60; // Change direction every 1 to 2 seconds (assuming 60 FPS)
        }
        this.follow(this.wanderTargetX, this.wanderTargetY, false);
    }

    draw(iter) {
        if (this.type === 'lizard') {
            ctx.lineWidth = 2; // Thicker lines for the lizard
            var r = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, Math.PI / 4 + this.absAngle, 7 * Math.PI / 4 + this.absAngle);
            ctx.moveTo(this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle), this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle));
            ctx.lineTo(this.x + r * Math.cos(this.absAngle) * 2 ** 0.5, this.y + r * Math.sin(this.absAngle) * 2 ** 0.5);
            ctx.lineTo(this.x + r * Math.cos(Math.PI / 4 + this.absAngle), this.y + r * Math.sin(Math.PI / 4 + this.absAngle));
            ctx.stroke();
        } else if (this.type === 'spider') {
            ctx.lineWidth = 3; // Thicker lines for the spider
            var r = 8; // Spider body radius
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = "white"; 
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.stroke();
        }

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].draw(true);
            }
        }
    }
}
var lizard;
var spider;

function setupLizard(size, legs, tail) {
    var s = size;
    lizard = new Creature('lizard', window.innerWidth / 2, window.innerHeight / 2, 0, s * 10, s * 2, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var spinal = lizard;
    //Neck
    for (var i = 0; i < 6; i++) {
        spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
        for (var ii = -1; ii <= 1; ii += 2) {
            var node = new Segment(spinal, s * 3, ii, 0.1, 2);
            for (var iii = 0; iii < 3; iii++) {
                node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
            }
        }
    }
    //Torso and legs
    for (var i = 0; i < legs; i++) {
        if (i > 0) {
            //Vertebrae and ribs
            for (var ii = 0; ii < 6; ii++) {
                spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
                for (var iii = -1; iii <= 1; iii += 2) {
                    var node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
                    for (var iv = 0; iv < 3; iv++) {
                        node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
                    }
                }
            }
        }
        //Legs and shoulders
        for (var ii = -1; ii <= 1; ii += 2) {
            var node = new Segment(spinal, s * 12, ii * 0.785, 0, 8); //Hip
            node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1); //Humerus
            node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2); //Forearm
            for (var iii = 0; iii < 4; iii++) { //fingers
                new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
            }
            new LegSystem(node, 3, s * 12, lizard);
        }
    }
    //Tail
    for (var i = 0; i < tail; i++) {
        spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
        for (var ii = -1; ii <= 1; ii += 2) {
            var node = new Segment(spinal, s * 3, ii, 0.1, 2);
            for (var iii = 0; iii < 3; iii++) {
                node = new Segment(node, s * 3 * (tail - i) / tail, -ii * 0.1, 0.1, 2);
            }
        }
    }
}

function setupSpider(size, legs) {
    var s = size;
    spider = new Creature('spider', window.innerWidth / 2, window.innerHeight / 2, 0, s * 10, s * 2.5, 0.3, 12, 0.5, 0.1, 0.5, 0.5);

    // Body with Cephalothorax and Abdomen
    var cephalothorax = new Segment(spider, s * 3, 0, 0.5, 1.2);
    var abdomen = new Segment(cephalothorax, s * 5, 0, 0.5, 1.5);

    //Legs attached to cephalothorax
    for (var i = 0; i < legs; i++) {
        var side = (i < legs / 2) ? -1 : 1;
        var angle = side * (Math.PI / 3 + (i % (legs / 2)) * Math.PI / 6)
        var node = new Segment(cephalothorax, s * 6, angle, 0, 8);
        node = new Segment(node, s * 10, -angle / 2, 6.28, 1);
        node = new Segment(node, s * 10, angle / 2, 3.1415, 2);
        node = new Segment(node, s * 6, -angle / 4, 3.1415, 2);
        new LegSystem(node, 4, s * 16, spider);
    }
}

canvas.style.backgroundColor = "black";
ctx.strokeStyle = "white";
ctx.fillStyle = "white";

function init() {
    score = 0;
    gameOver = false;
    startTime = Date.now();
    scoreElement.innerText = 'Score: 0';
    gameOverElement.style.display = 'none';

    var legNum = 4;
    setupLizard(8 / Math.sqrt(legNum), legNum, 20);
    setupSpider(5, 8);
}

restartButton.onclick = function() {
    init();
    requestAnimationFrame(gameLoop);
};

let lastTime = 0;
function gameLoop(timestamp) {
    if (gameOver) {
        return;
    }
    
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Score based on survival time
    score = Math.floor((Date.now() - startTime) / 100);
    scoreElement.innerText = 'Score: ' + score;

    var distBetween = Math.hypot(lizard.x - spider.x, lizard.y - spider.y);

    if (distBetween < 10) {
        gameOver = true;
        gameOverElement.style.display = 'block';
    }

    lizard.follow(Input.mouse.x, Input.mouse.y);
    
    // Make spider move randomly
    spider.wander();

    ctx.fillStyle = "white";
    lizard.draw(true);
    spider.draw(true);

    requestAnimationFrame(gameLoop);
}

init();
requestAnimationFrame(gameLoop);