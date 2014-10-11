$(function () {

  var socket = io();
  console.log('start output!');

  var WIDTH = 1000;
  var HEIGHT = 600;
  var CENTER = {x: WIDTH/2, y: HEIGHT/2};
  var INNER_SIZE = 275;
  var OUTER_SIZE = 300;

  var State = null;

  var LoadedSounds = {};

  var soundLoaded = function (event) {
    LoadedSounds[event.id] = true;
    if (event.id === "BackgroundMusic") {
      createjs.Sound.play('sounds/backGroundMusic.mp3');
    }
  };

  var audioPath = 'sounds/';
  var manifest = [
    {id:"BackgroundMusic", src:'backGroundMusic.mp3'}
  , {id: 'error', src: 'error.mp3'}
  , {id: 'placeTheMine', src: 'placeTheMine.mp3'}
  , {id: 'backGroundSound_Alert', src: 'backGroundSound_Alert.mp3'}
  , {id: 'failure', src: 'failure.mp3'}
  , {id: 'winningSound1', src: 'winningSound1.mp3'}
  , {id: 'clockCountDown', src: 'clockCountDown.mp3'}
  , {id: 'mineExplosion', src: 'mineExplosion.mp3'}
  , {id: 'winningSound2', src: 'winningSound2.mp3'}
  ];

  var canPlay = createjs.Sound.initializeDefaultPlugins();

  createjs.Sound.alternateExtensions = ['mp3'];
  createjs.Sound.addEventListener('fileload', soundLoaded);
  createjs.Sound.registerManifest(manifest, audioPath);

  var resetGame = function () {
    State = {
      mines: []
    , player: {x: CENTER.x, y: CENTER.y, dir: {x: 10, y: 0}, dashCooldown: 0, fullDashTime: 800, dashResetTime: 700}
    , runState: 'PLAY'
    , timer: 30000
    , maxTimer: 30000
    };
    if (LoadedSounds["BackgroundMusic"] === true) {
      createjs.Sound.play('sounds/backGroundMusic.mp3');
    }
  }

  var gameCanvas = $('.js-canvas')[0];
  var ctx = gameCanvas.getContext("2d");

  // if (window.devicePixelRatio == 2) {
  //     gameCanvas.setAttribute('height', window.innerHeight * 2);
  //     gameCanvas.setAttribute('width', window.innerWidth * 2);
  //     ctx.scale(2, 2);
  // } else {
  //   gameCanvas.setAttribute('height', window.innerHeight);
  //   gameCanvas.setAttribute('width', window.innerWidth);
  // }

  var MAXCOUNT = 3;
  gameCanvas.setAttribute('height', 600);
  gameCanvas.setAttribute('width', 1000);

  socket.on('touch', function (e) {
    if (State.mines.length < MAXCOUNT) {
      createjs.Sound.play('sounds/placeTheMine.mp3');
      State.mines.push({x: e.x, y: e.y, radius: 10, cooldown: 700, sound: false});
    } else {
      createjs.Sound.play('sounds/error.mp3');
    }
  });

  var Keys = {
    RIGHT: 39
  , LEFT: 37
  , UP: 38
  , DOWN: 40
  , SPACE: 32
  };
  var KeyState = {
    39: false
  , 37: false
  , 38: false
  , 40: false
  , 32: false
  }
  $(window).keydown(function (event) {
    for (var opt in Keys) {
      if (Keys.hasOwnProperty(opt)) {
        if (event.which === Keys[opt]) {
          KeyState[Keys[opt]] = true;
          event.preventDefault();
        }
      }
    }
  });
  $(window).keyup(function (event) {
    for (var opt in Keys) {
      if (Keys.hasOwnProperty(opt)) {
        if (event.which === Keys[opt]) {
          KeyState[Keys[opt]] = false;
          event.preventDefault();
        }
      }
    }
  });

  var addVec = function (a, b) {
    return {x: a.x + b.x, y: a.y + b.y};
  }

  var scaleVec = function (a, val) {
    return {x: a.x * val, y: a.y * val};
  }

  var magnitude = function (a) {
    return Math.sqrt(a.x*a.x+a.y*a.y);
  }

  var normalize = function (a) {
    var m = magnitude(a);
    return {x: a.x/m, y: a.y/m};
  }

  var collision = function (point, circle) {
    return (magnitude(addVec(point, scaleVec(circle, -1))) <= circle.radius);
  }

  var updatePlayer = function (diff) {
    var speed = 0.39;
    var dirMag = 10;
    var dir = {x: 0, y: 0};

    if (KeyState[Keys.SPACE] && State.player.dashCooldown <= -State.player.dashResetTime) {
      State.player.dashCooldown = State.player.fullDashTime;
    }

    if (State.player.dashCooldown > -State.player.dashResetTime) {
      State.player.dashCooldown -= diff;
    }

    if (State.player.dashCooldown > 0) {
      speed = 1;
    }

    if (KeyState[Keys.LEFT]) {
      dir.x = -1;
    }
    if (KeyState[Keys.RIGHT]) {
      dir.x = 1;
    }
    if (KeyState[Keys.UP]) {
      dir.y = -1;
    }
    if (KeyState[Keys.DOWN]) {
      dir.y = 1;
    }
    var newPos = addVec(State.player,scaleVec(dir,diff*speed));
    if (magnitude(addVec(newPos,{x: -CENTER.x, y: -CENTER.y})) > INNER_SIZE) {
      newPos = addVec(scaleVec(normalize(addVec(newPos,{x: -CENTER.x, y: -CENTER.y})), INNER_SIZE),{x: CENTER.x, y: CENTER.y});
    }



    State.player.x = newPos.x;
    State.player.y = newPos.y;
    var resDir = scaleVec(normalize(dir), dirMag);
    if (magnitude(resDir) > 0) {
      State.player.dir = resDir;
    }
  }

  var lastTimestamp = null;
  var step = function (timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    var diff = timestamp - lastTimestamp;

    if (State.runState === 'PLAY') {
      updatePlayer(diff);
    }

    // Wipe screen
    ctx.clearRect(0,0,WIDTH,HEIGHT);

    ctx.setFillColor('gray', 1);

    // Draw Timer
    if (State.runState === 'PLAY') {
      State.timer -= diff;
      if (State.timer <= 0) {
        State.runState = 'WIN';
        createjs.Sound.stop();
        createjs.Sound.play('sounds/winningSound1.mp3');
        $('.js-win').removeClass('hidden');
        setTimeout(function () {
          $('.js-win').addClass('hidden');
          resetGame();
        }, 5000);
      }
    }
    ctx.beginPath();
    ctx.arc(CENTER.x,CENTER.y,OUTER_SIZE,0,Math.PI*2, false); // outer
    ctx.arc(CENTER.x,CENTER.y,INNER_SIZE,Math.PI*2, 0, true); // inner
    ctx.closePath();
    ctx.fill();

    ctx.setFillColor('white', 1);

    ctx.beginPath();
    ctx.arc(CENTER.x,CENTER.y,OUTER_SIZE,0,State.timer/State.maxTimer * Math.PI*2, false); // outer
    ctx.arc(CENTER.x,CENTER.y,INNER_SIZE,State.timer/State.maxTimer * Math.PI*2, Math.PI*2, true); // inner
    ctx.closePath();
    ctx.fill();


    // Draw Player
    if (State.player.dashCooldown > 0) {
      ctx.setFillColor('yellow', 1);
    }

    var p = State.player;
    var playerWidth = 0.4;
    var dirPerp = {x: -p.dir.y, y: p.dir.x};
    var right = addVec(p,p.dir);
    var top = addVec(addVec(dirPerp, p), scaleVec(p.dir, -playerWidth));
    var bottom = addVec(addVec(scaleVec(dirPerp, -1), p), scaleVec(p.dir, -playerWidth));
    ctx.beginPath();
    ctx.moveTo(right.x, right.y);
    ctx.lineTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.closePath();
    ctx.fill();

    ctx.setFillColor('white', 1);

    for (var i = 0; (i < State.mines.length) && State.runState === 'PLAY'; i++) {
      var m = State.mines[i];

      if (m.cooldown > 0) {
        ctx.setFillColor('white', 1);
        m.cooldown -= diff;
      } else {
        if (!m.sound) {
          createjs.Sound.play('sounds/mineExplosion.mp3');
          m.sound = true;
        }
        ctx.setFillColor('red', 1);
        // Mine is exploding
        m.radius += diff * 0.3;

        if (!(State.player.dashCooldown > 0) && State.runState === 'PLAY' && (collision(right,m) || collision(top,m) || collision(bottom,m))) {
          State.runState = 'DEATH';
          createjs.Sound.stop();
          createjs.Sound.play('sounds/failure.mp3');
          $('.js-lose').removeClass('hidden');
          setTimeout(function () {
            $('.js-lose').addClass('hidden');
            resetGame();
          }, 5000);
        }

        if (m.radius >= 60) {
            State.mines.splice(i, 1);
            i--; //decrement
        }
      }

      ctx.beginPath();
      if (m.cooldown > 0) {
        var percent = ((Math.sin(m.cooldown*0.7)+1)/2);
        ctx.arc(m.x, m.y, percent*m.radius, 0, Math.PI*2, true);
      } else {
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI*2, true);
      }
      ctx.closePath();
      ctx.fill();
    }

    lastTimestamp = timestamp;
    window.requestAnimationFrame(step);
  }

  // Start the loop
  resetGame();
  window.requestAnimationFrame(step);

});