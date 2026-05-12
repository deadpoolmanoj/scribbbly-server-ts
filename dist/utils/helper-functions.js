"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoomId = generateRoomId;
exports.getRandomDrawableWord = getRandomDrawableWord;
exports.getPoints = getPoints;
exports.getRandomBrainrotName = getRandomBrainrotName;
const drawableWords = [
    "cat", "dog", "sun", "moon", "star", "tree", "car", "house", "fish", "apple",
    "banana", "book", "chair", "table", "phone", "shoe", "hat", "clock", "cup", "ball",
    "kite", "train", "bus", "boat", "plane", "snake", "frog", "duck", "bear", "lion",
    "tiger", "pizza", "burger", "cake", "cookie", "ice cream", "pencil", "pen", "brush", "camera",
    "robot", "ghost", "alien", "rocket", "crown", "diamond", "gift", "drum", "guitar", "violin",
    "flower", "leaf", "mountain", "river", "cloud", "rain", "snowman", "fire", "volcano", "island",
    "bed", "lamp", "mirror", "door", "window", "backpack", "bottle", "glasses", "watch", "key",
    "helmet", "sword", "shield", "treasure", "pirate", "castle", "dragon", "whale", "octopus", "crab",
    "spider", "bee", "butterfly", "candle", "cookie", "donut", "popcorn", "sandwich", "egg", "milk",
    "toothbrush", "soap", "towel", "television", "computer", "mouse", "keyboard", "headphones", "microphone", "battery"
];
function generateRoomId() {
    return Math.random()
        .toString(36)
        .substring(2, 9);
}
function getRandomDrawableWord() {
    const randomIndex = Math.floor(Math.random() * drawableWords.length);
    return drawableWords[randomIndex];
}
function getPoints(position) {
    if (position === 0)
        return 10;
    if (position === 1)
        return 7;
    if (position === 2)
        return 5;
    return 1;
}
const brainrotNames = [
    "skibidi_ninja",
    "sigma_toilet",
    "gyatt_killer",
    "rizz_god_69",
    "mewing_master",
    "ohio_finalboss",
    "capuccino_bandit",
    "slay_tractor",
    "fanum_taxer",
    "brrr_skibidi",
    "sigma_sigma_boy",
    "toilet_warrior",
    "gyatt_sniper",
    "rizzler_x",
    "locked_in_larry",
    "no_cap_champion",
    "skibidi_overlord",
    "mewing_sniper",
    "brainrot_king",
    "alpha_toilet",
    "beta_escapee",
    "goofy_rizzler",
    "skibidi_freak",
    "ohio_survivor",
    "npc_main_character",
    "speed_rizz_demon",
    "unc_sigma",
    "fax_machine",
    "delulu_warrior",
    "aura_farmer"
];
function getRandomBrainrotName() {
    const index = Math.floor(Math.random() * brainrotNames.length);
    return brainrotNames[index];
}
