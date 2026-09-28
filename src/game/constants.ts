/** World layout. One unit is roughly one meter. */
export const GRID_BLOCKS = 8;
export const BLOCK_SIZE = 64;
export const ROAD_WIDTH = 24;
export const PITCH = BLOCK_SIZE + ROAD_WIDTH;
export const WORLD_SIZE = GRID_BLOCKS * PITCH + ROAD_WIDTH;
export const WORLD_HALF = WORLD_SIZE / 2;
export const SIDEWALK = 5;
export const LANE_WIDTH = 5;
export const LANE_OFFSETS = [3.5, 8.5];

/** Player car handling. */
export const CAR_RADIUS = 1.5;
export const MAX_SPEED = 46;
export const MAX_REVERSE = 14;
export const ENGINE_ACCEL = 30;
export const BRAKE_DECEL = 48;
export const COAST_DRAG = 0.04;
export const GRIP = 9;
export const DRIFT_GRIP = 1.7;
export const MAX_TURN_RATE = 2.3;
export const DRIFT_TURN_BOOST = 1.35;
export const STEER_RESPONSE = 7;
export const GRAVITY = 32;
export const STEP_HEIGHT = 0.9;
export const WALL_RESTITUTION = 0.35;
export const CRASH_SPEED = 9;

/** Ramps. */
export const RAMP_LENGTH = 11;
export const RAMP_WIDTH = 9;
export const RAMP_HEIGHT = 2.9;

/** Traffic. */
export const TRAFFIC_COUNT = 34;
export const TRAFFIC_RADIUS = 1.5;
export const TRAFFIC_MIN_SPEED = 9;
export const TRAFFIC_MAX_SPEED = 15;
export const TRAFFIC_LOOKAHEAD = 13;
export const TRAFFIC_STUN_TIME = 2.2;

/** Fares and clock. */
export const START_CLOCK = 60;
export const MAX_CLOCK = 99;
export const WAITING_FARES = 7;
export const PICKUP_RADIUS = 8;
export const DROPOFF_RADIUS = 9;
export const STOP_SPEED = 4;
export const FARE_RATE = 0.42;
export const FARE_BASE = 8;
export const FARE_PACE = 17;
export const FARE_BUFFER = 9;
export const SHORT_FARE = 220;
export const LONG_FARE = 430;

/** Tips. */
export const NEAR_MISS_DIST = 5.2;
export const NEAR_MISS_SPEED = 14;
export const NEAR_MISS_TIP = 4;
export const JUMP_MIN_AIR = 0.35;
export const JUMP_TIP_RATE = 14;
export const DRIFT_MIN_TIME = 0.7;
export const DRIFT_MIN_SLIP = 9;
export const DRIFT_TIP_RATE = 5;
export const COMBO_WINDOW = 5;
export const COMBO_MAX = 8;
