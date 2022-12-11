// GAME CONCEPT: A spooky camping trip! Run through a forest to collect fire wood, but don't get caught by Spoopy the Ghost!

// CORE:
// TODO: ghost spawning
// TODO: ghost follow player
// TODO: ghost collision + game over
// TODO: game reset
// TODO: lose condition (fire goes out or hit by ghost)
// TODO: fire spawn
// TODO: fire lifetime + glow
// TODO: night time color palette

// NICE TO HAVE:
// TODO: start menu
// TODO: custom controls
// TODO: sound effects

const GAME_W = 320;
const GAME_H = 240;

const LIGHT_SOURCE = {
  x: 0,
  y: 0,
  sprite: "",
  brightness: 1,
};
let target_alpha = 0.04;
let sun_alpha = 0.01;
let sun_alpha_2 = 0.01;

const STATES = {
  game_over: "game_over",
  start: "start",
  in_game: "in_game",
  menu: "menu",
};
var game_state = "in_game";

// GRID PROPS
const BLOCK_W = 32;
const COLS = 6;
const ROWS = 4;
const PADDING = 4;

// OBJECTS
const PLAYER = {
  x: GAME_W / 2 - 16,
  y: GAME_H - 48,
  dx: 0,
  dy: 0,
  w: 32,
  h: 32,
  color: MID_PURPLE,
  speed: 4,
  type: "player",
  shoot_rate: 18,
  shoot_timer: 0,
  heart: {
    color: MID_PURPLE,
    x: GAME_W / 2 - 16,
    y: GAME_H - 48,
    w: 8,
    h: 8,
  },
  positions: [],
  has_trail: false,
  buffer: 4,
};

const SHOT = {
  x: GAME_W / 2 - 4,
  y: GAME_H / 2 - 4,
  w: 8,
  h: 8,
  dx: 0,
  dy: -3,
  color: GREEN,
  speed: 0.1,
  type: "shot",
  top_speed: 1,
  positions: [],
  has_trail: true,
  health: 3,
};

const BLOCK = {
  x: GAME_W / 2,
  y: 120,
  dx: 0,
  dy: 0,
  prev_x: 0,
  prev_y: 0,
  w: BLOCK_W,
  h: 16,
  color: "#964B00",
  speed: 0,
  type: "block",
  positions: [],
  has_trail: false,
  glow: true,
};

// PLAYERS
let player = JSON.parse(JSON.stringify(PLAYER));
let GAME_OBJECTS = [player, BLOCK];

// UTILS
const shoot = (shooter, projectile) => {
  let new_shot = JSON.parse(JSON.stringify(projectile));
  new_shot.x = shooter.x + shooter.w / 2 - projectile.w / 2;
  new_shot.y = shooter.y - shooter.h;
  GAME_OBJECTS.push(new_shot);
};

const spawnGhost = () => {
  let new_block = JSON.parse(JSON.stringify(BLOCK));
  new_block.x = Math.floor(Math.random() * GAME_W - BLOCK_W);
  if (new_block.x < 0) new_block.x += BLOCK_W;
  new_block.y = 0;
  GAME_OBJECTS.push(new_block);
};

const spawnWood = () => {
  let new_block = JSON.parse(JSON.stringify(BLOCK));

  new_block.x = Math.floor(Math.random() * GAME_W - new_block.w);
  new_block.y = Math.floor(Math.random() * GAME_W - new_block.h);

  if (new_block.x < 0) new_block.x += new_block.w;
  if (new_block.y < 0) new_block.y += new_block.h;

  while (
    getDistance(player.heart.x, player.heart.y, new_block.x, new_block.y) <
    player.w
  ) {
    new_block.x += new_block.w;
    new_block.y += new_block.h;
  }

  GAME_OBJECTS.push(new_block);
};

const split = (object) => {
  // make 2 new objects
  let left_object = JSON.parse(JSON.stringify(object));
  let right_object = JSON.parse(JSON.stringify(object));

  // dimensions
  left_object.w = object.w / 2;
  right_object.w = object.w / 2;

  // position
  right_object.x = object.x + object.w / 2;

  // direction
  left_object.dx = -1;
  right_object.dx = 1;

  // remove original object
  let index = GAME_OBJECTS.indexOf(object);
  GAME_OBJECTS.splice(index, 1);

  poof(object.x, object.y, object.color, 1, false);

  // spawn new objects
  if (left_object.w > 4 && right_object.w > 4) {
    GAME_OBJECTS.push(left_object);
    GAME_OBJECTS.push(right_object);
  }
};

const genGrid = (brick, rows, cols, start_x = 0, start_y = 0) => {
  let new_grid = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // copy obj template
      let new_brick = JSON.parse(JSON.stringify(brick));

      // initial pos
      new_brick.x = start_x + j * new_brick.w + PADDING * j;
      new_brick.y = start_y + i * new_brick.h + PADDING * i;

      // add to grid
      new_grid.push(new_brick);
    }
  }
  return new_grid;
};

function easing(x, target) {
  return (x += (target - x) * 0.1);
}

function easingWithRate(x, target, rate, tolerance = 0) {
  if (tolerance > 0 && x >= target * tolerance) return easing(x, target);
  return (x += (target - x) * rate);
}

const move = (object) => {
  // ARROWS
  INPUTS.ArrowRight
    ? (object.dx = easingWithRate(object.dx, object.speed, 0.2))
    : null;
  INPUTS.ArrowLeft
    ? (object.dx = easingWithRate(object.dx, -1 * object.speed, 0.2))
    : null;
  INPUTS.ArrowUp
    ? (object.dy = easingWithRate(object.dy, -1 * object.speed, 0.2))
    : null;
  INPUTS.ArrowDown
    ? (object.dy = easingWithRate(object.dy, object.speed, 0.2))
    : null;

  if (
    !INPUTS.ArrowRight &&
    !INPUTS.ArrowLeft &&
    !INPUTS.ArrowDown &&
    !INPUTS.ArrowUp
  ) {
    object.dx = easingWithRate(object.dx, 0, 0.2);
    object.dy = easingWithRate(object.dy, 0, 0.2);
  }

  // A/D
  // INPUTS.d ? (object.dx = easingWithRate(object.dx, object.speed, 0.2)) : null;
  // INPUTS.a
  //   ? (object.dx = easingWithRate(object.dx, -1 * object.speed, 0.2))
  //   : null;

  // if (!INPUTS.d && !INPUTS.a) {
  //   object.dx = easingWithRate(object.dx, 0, 0.2);
  // }
};

const pickDirection = (obj) => {
  let dy = Math.random() > 0.5 ? -1 : 1;
  let dx = Math.random() > 0.5 ? -1 : 1;
  obj.dx = dx;
  obj.dy = dy;
};

const bounceBall = (ball, other) => {
  ball.x = ball.prev_x;
  ball.y = ball.prev_y;

  // hit left side
  if (ball.x + ball.w < other.x) {
    ball.dx = Math.abs(ball.dx) * -1;
    // ball.dx *= -1;
  }
  // hit right side
  else if (ball.x > other.x + other.w) {
    ball.dx = Math.abs(ball.dx);
  }
  // hit top
  else if (ball.y + ball.h < other.y) {
    ball.dy = Math.abs(ball.dy) * -1;
  }
  // hit bottom
  else if (ball.y > other.y + other.h) {
    ball.dy = Math.abs(ball.dy);
  }
  // default
  else {
    if (ball.dy > 0) {
      ball.y -= ball.h;
    } else if (ball.dy < 0) {
      ball.y += ball.h;
    }
  }

  // if the ball hit a paddle, move the ball faster
  if (other.type === "paddle") {
    ball.top_speed += 0.1;
    if (ball.top_speed > 2) {
      ball.top_speed = 2;
    }
    return;
  }

  // remove other + shake screen
  let other_idx = GAME_OBJECTS.indexOf(other);
  GAME_OBJECTS.splice(other_idx, 1);
  poof(
    other.x + other.w / 2,
    other.y + other.h - other.h / 4,
    other.color,
    1,
    false
  );
  screenshakesRemaining = HIT_SCREENSHAKES;
};

function collisionDetected(obj_a, obj_b) {
  return (
    obj_a.x < obj_b.x + obj_b.w &&
    obj_a.x + obj_a.w > obj_b.x &&
    obj_a.y < obj_b.y + obj_b.h &&
    obj_a.y + obj_a.h > obj_b.y
  );
}

function clamp(num, min, max) {
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function trackPosition(object) {
  let pos = { x: object.prev_x, y: object.prev_y };
  object.positions.push(pos);
  if (object.positions.length > 10) {
    object.positions.shift();
  }
}

function drawTrail(positions, obj) {
  positions?.forEach((pos, i) => {
    // ratio that moves toward one as we reach the end of the trail
    // useful for gradually increasing size/alpha/etc
    let ratio = (i + 1) / positions.length;

    // keep height and width within range of the leading object's size
    let w = clamp(ratio * obj.w, 1, obj.w);
    let h = clamp(ratio * obj.h, 1, obj.h);

    // center trail with leading object
    let x = pos.x;
    let y = pos.y;

    x -= w / 2;
    y -= h / 2;

    x += obj.w / 2;
    y += obj.h / 2;

    // increase alpha as we get closer to the front of the trail
    context.fillStyle = "rgba(255, 255, 255, " + ratio / 2 + ")";
    context.fillRect(x, y, w, h);
  });
}

function updateScreenshake() {
  if (screenshakesRemaining > 0) {
    // starts max size and gets smaller
    let wobble = Math.round(
      (screenshakesRemaining / HIT_SCREENSHAKES) * SCREENSHAKE_MAX_SIZE
    );
    if (screenshakesRemaining % 4 < 2) wobble *= -1; // alternate left/right every 2 frames
    context.setTransform(1, 0, 0, 1, wobble, 0);
    screenshakesRemaining--;
  } else {
    context.setTransform(1, 0, 0, 1, 0, 0); // reset
  }
}

// INPUTS
const INPUTS = {
  // MOVE
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  a: false,
  d: false,
  w: false,
  s: false,

  // SHOOT
  [" "]: false,

  // PAUSE/START/QUIT
  Enter: false,
};
window.addEventListener("keydown", function (e) {
  if (INPUTS[e.key] !== undefined) {
    INPUTS[e.key] = true;
  }
});
window.addEventListener("keyup", function (e) {
  if (INPUTS[e.key] !== undefined) {
    INPUTS[e.key] = false;
  }
});

const resetGame = () => {
  GAME_OBJECTS.length = 0;

  let player = JSON.parse(JSON.stringify(PLAYER));
  GAME_OBJECTS = [player];

  game_state = STATES.start;
  start_timer = 4;
  score = 0;
};

// LOOP
const update = (dt) => {
  // collision groups
  let players = GAME_OBJECTS.filter((obj) => obj.type === "player");
  let blocks = GAME_OBJECTS.filter((obj) => obj.type === "block");

  // vfx
  particles.update();

  target_alpha = Math.random() * 0.02;
  sun_alpha += Math.sin(1 / target_alpha) * 0.01;
  target_alpha = Math.random() * 0.02;
  sun_alpha_2 += Math.sin(1 / target_alpha) * 0.01;

  sun_alpha = clamp(sun_alpha, 0.01, 0.4);
  sun_alpha_2 = clamp(sun_alpha_2, 0.01, 0.4);

  LIGHT_SOURCE.brightness = sun_alpha;

  // GAME STATES
  if (game_state === STATES.menu) {
    if (INPUTS.Enter) {
      game_state = STATES.start;
    }
    return;
  }
  if (game_state === STATES.start) {
    // tick timer until the game is ready to start

    start_timer -= 0.02;

    if (start_timer <= 0) {
      game_state = STATES.in_game;
    }

    return;
  }
  if (game_state === STATES.in_game) {
    // invincibility frames
    if (i_frames > 0) {
      i_frames -= 1;
    }

    if (i_frames <= 0) {
      i_frames = 0;
    }

    // player group
    players.forEach((player) => {
      trackPosition(player);

      // PLAYER MOVEMENT
      player.prev_x = player.x;
      player.prev_y = player.y;

      move(player);

      if (player.shoot_timer > 0) {
        player.shoot_timer += 1;
      }

      if (player.shoot_timer >= player.shoot_rate) {
        player.shoot_timer = 0;
      }

      player.x += player.dx;
      player.y += player.dy;

      players.forEach((other_player) => {
        if (other_player === player) return;
        if (collisionDetected(player, other_player)) {
          player.x = player.prev_x;
        }
      });

      if (player.x <= 0) player.x = player.prev_x;
      if (player.x + player.w >= GAME_W) player.x = player.prev_x;
      if (player.y <= 0) player.y = player.prev_y;
      if (player.y + player.h >= GAME_H) player.y = player.prev_y;

      // player hitboxes
      player.heart.w = player.w / 4;

      player.heart.x = player.x + player.w / 2 - player.heart.w / 2;
      player.heart.y = player.y + player.h / 2 - player.heart.h / 2;

      // collision against blocks
      blocks.forEach((block) => {
        if (collisionDetected(player.heart, block) && i_frames < 1) {
          // particle effect and screen shake on player destruction
          poof(
            player.x + player.w / 2,
            player.y + player.h - player.h / 4,
            block.color,
            1,
            false
          );
          // screenshakesRemaining = HIT_SCREENSHAKES;

          // remove block that hit the player
          GAME_OBJECTS.splice(GAME_OBJECTS.indexOf(block), 1);

          // split the player into smaller players
          // split(player);

          // give the player a span of invincibility frames
          // i_frames = invincibility_duration;

          spawnWood();

          score += 1;
        }
      });
    });

    // block group
    blocks.forEach((block) => {
      trackPosition(block);

      block.prev_x = block.x;
      block.prev_y = block.y;

      // block.positions.push({ x: block.prev_x, y: block.prev_y });
      // if (block.positions.length > Math.floor(block.top_speed * 10)) {
      //   block.positions.shift();
      // }

      block.speed = 1;
      block.x += block.dx * block.speed;
      block.y += block.dy * block.speed;

      // wall collision
      if (block.x + block.w > GAME_W) {
        block.dx = -1;
      }
      if (block.x < 0) {
        block.dx = 1;
      }
      if (block.y + block.w > GAME_H) {
        block.dy = -1;
      }
      if (block.y < 0) {
        block.dy = 1;
      }

      // block.speed = easing(block.speed, block.top_speed);
    });

    // prevent pixelation on movement
    GAME_OBJECTS.forEach((obj) => {
      // obj.x = Math.floor(obj.x);
      // obj.y = Math.floor(obj.y);
    });

    // spawning
    let spawn_count = blocks.length;
    spawn_timer++;
    if (spawn_timer >= spawn_rate && spawn_count < spawn_limit) {
      // spawnGhost();
      // spawnWood();
      spawn_timer = 0;
    }

    updateScreenshake();

    // despawning
    GAME_OBJECTS.forEach((obj) => {
      if (obj.remove) {
        poof(obj.x + obj.w / 2, obj.y + obj.h / 2, obj.color, 1, false);
        let idx = GAME_OBJECTS.indexOf(obj);
        GAME_OBJECTS.splice(idx, 1);
      }
    });

    if (players.length < 1) {
      game_state = "game_over";
    }

    return;
  }
  if (game_state === STATES.game_over) {
    if (INPUTS.Enter) {
      resetGame();
      game_state = STATES.start;
    }
    return;
  }
};

const draw = () => {
  context.fillStyle = NAVY;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // render objects
  GAME_OBJECTS.forEach((obj) => {
    // Render trail underneath objects
    if (obj.has_trail) {
      drawTrail(obj.positions, obj);
    }

    // --- LIGHT RENDERING CODE ---
    // TODO: factor in brightness of light
    // TODO: dynamically place light source

    // Get colors for gradients and shadows
    let distance_to_light = Math.ceil(
      getDistance(obj.x, obj.y, LIGHT_SOURCE.x, LIGHT_SOURCE.y)
    );
    let light_angle =
      Math.atan2(
        LIGHT_SOURCE.y - obj.y + obj.h / 2,
        LIGHT_SOURCE.x - obj.x + obj.w / 2
      ) *
      (180 / Math.PI);

    console.log(light_angle);
    context.fillStyle = obj.color;
    const firstGradientColor = colorLuminance(obj.color, 0.2);
    const secondGradientColor = colorLuminance(obj.color, -0.17);
    const darkColor = colorLuminance(obj.color, 0.1 * -1);
    const lightColor = colorLuminance(obj.color, 0.15);

    // Create gradient fill color
    context.fillStyle = obj.color;
    console.log(obj.y);
    var gradient = context.createLinearGradient(
      obj.x,
      obj.y,
      obj.x + obj.w,
      obj.y + obj.h
    );
    gradient.addColorStop(0, firstGradientColor);
    // gradient.addColorStop(1 * LIGHT_SOURCE.brightness, firstGradientColor);
    gradient.addColorStop(1, secondGradientColor);

    // Light shadow
    if (obj.glow) {
      context.shadowInset = false;
      context.shadowOffsetX = -4;
      context.shadowOffsetY = -4;
      context.shadowBlur = 60;
      context.shadowColor = lightColor;
      roundRect(context, obj.x, obj.y, obj.w, obj.h, 4, true, false);
    }

    // Dark shadow
    context.rect(-obj.w, -obj.h, obj.h, obj.w);
    context.shadowInset = false;

    // context.shadowOffsetX = 4;
    // context.shadowOffsetY = 4;
    context.shadowOffsetX = -4 * Math.cos((light_angle * Math.PI) / 180);
    context.shadowOffsetY = -4 * Math.sin((light_angle * Math.PI) / 180);

    context.shadowBlur = 800 / distance_to_light;
    context.globalAlpha = 0.5;
    context.shadowColor = "#000000";
    context.fillStyle = "#000000";

    let shadow_w =
      obj.w +
      (obj.w / distance_to_light) * Math.cos((light_angle * Math.PI) / 180);
    let shadow_h =
      obj.h +
      (obj.h / distance_to_light) * Math.sin((light_angle * Math.PI) / 180);

    roundRect(context, obj.x, obj.y, shadow_w, shadow_h, 4, true, false);
    context.globalAlpha = 1;

    // Reset shadow drawing
    context.shadowColor = "none";
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 0;

    // Render object
    context.fillStyle = gradient;
    roundRect(context, obj.x, obj.y, obj.w, obj.h, 4, true, false);

    // --- END NEUMORPHIC RENDERING CODE ---

    // player-specific rendering
    if (obj.type === "player") {
      // i frame flash
      if (i_frames > 0) {
        obj.color = i_frames % 2 === 0 ? "#ffffff" : MID_PURPLE;
      }

      // heart
      context.fillStyle = "red";
      context.fillRect(obj.heart.x, obj.heart.y, obj.heart.w, obj.heart.h);
    }
  });

  context.globalAlpha = sun_alpha;
  context.drawImage(IMAGES["sun_1"], 0, 0);
  context.globalAlpha = sun_alpha_2;
  context.drawImage(IMAGES["sun_2"], 0, 0);
  context.globalAlpha = 1;

  // timer
  if (game_state === STATES.start) {
    context.fillStyle = "white";
    context.fillText(Math.floor(start_timer), GAME_W / 2 - 4, GAME_H / 2 - 16);
  }

  if (game_state === STATES.game_over) {
    context.fillStyle = "white";
    let game_over_text = "GAME OVER!";
    let game_over_w = context.measureText(game_over_text).width;
    context.fillText(game_over_text, GAME_W / 2 - game_over_w / 2, GAME_H / 2);

    let score_text = "SCORE:" + score.toFixed(0);
    let score_text_w = context.measureText(score_text).width;
    context.fillText(
      score_text,
      GAME_W / 2 - score_text_w / 2,
      GAME_H / 2 + 16
    );
  }

  if (game_state === STATES.menu) {
    context.fillStyle = "white";

    let move_text = "MOVE WITH LEFT / RIGHT KEYS";
    let shoot_text = "SHOOT WITH SPACEBAR";
    let start_text = "PRESS ENTER TO START";
    let move_text_width = context.measureText(move_text).width;
    let shoot_text_width = context.measureText(shoot_text).width;
    let start_text_width = context.measureText(start_text).width;
    context.fillStyle = "white";
    context.fillText(move_text, GAME_W / 2 - move_text_width / 2, GAME_H / 2);
    context.fillText(
      shoot_text,
      GAME_W / 2 - shoot_text_width / 2,
      GAME_H / 2 + 16
    );
    context.fillText(
      start_text,
      GAME_W / 2 - start_text_width / 2,
      GAME_H / 2 + 48
    );
  }

  // fx
  particles.draw();

  // HUD
  context.fillStyle = "white";
  context.fillText(score, 12, 16);
};

const loop = () => {
  current_time = Date.now();
  let elapsed = current_time - start_time;
  start_time = current_time;
  lag += elapsed;

  while (lag > frame_duration) {
    update(elapsed / 1000);
    lag -= 1000 / fps;
    if (lag < 0) lag = 0;
  }

  var lag_offset = lag / frame_duration;
  draw(lag_offset);

  window.requestAnimationFrame(loop);
};

loop();
