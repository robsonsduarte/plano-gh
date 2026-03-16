import { ACTIVITY_MULT, DIET_MACROS } from '../data/foods.js';

/**
 * Calculate Basal Metabolic Rate using Harris-Benedict revised equation.
 * @param {string} sex - 'M' or 'F'
 * @param {number} weight - in kg
 * @param {number} height - in cm
 * @param {number} age - in years
 * @returns {number} TMB in kcal/day
 */
export function calcTMB(sex, weight, height, age) {
  if (sex === 'M') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  }
  return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
}

/**
 * Calculate Total Daily Energy Expenditure.
 * @param {number} tmb - Basal Metabolic Rate
 * @param {string} activityLevel - sedentary|light|moderate|very_active|extreme
 * @returns {number} TDEE in kcal/day
 */
export function calcTDEE(tmb, activityLevel) {
  const multiplier = ACTIVITY_MULT[activityLevel] || ACTIVITY_MULT.moderate;
  return Math.round(tmb * multiplier);
}

/**
 * Calculate macronutrient targets in grams.
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} dietType - normal|keto|carnivore|if
 * @returns {{ kcal: number, prot: number, carb: number, fat: number }}
 */
export function calcMacros(tdee, dietType) {
  const ratios = DIET_MACROS[dietType] || DIET_MACROS.normal;
  return {
    kcal: Math.round(tdee),
    prot: Math.round((tdee * ratios.protPct) / 4),
    carb: Math.round((tdee * ratios.carbPct) / 4),
    fat: Math.round((tdee * ratios.fatPct) / 9)
  };
}

/**
 * Calculate Body Mass Index.
 * @param {number} weight - in kg
 * @param {number} height - in cm
 * @returns {number} IMC value
 */
export function calcIMC(weight, height) {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

/**
 * Calculate ideal weight range based on IMC 18.5-24.9.
 * @param {number} height - in cm
 * @returns {{ min: number, max: number }}
 */
export function calcIdealWeight(height) {
  const heightM = height / 100;
  return {
    min: Math.round(18.5 * heightM * heightM * 10) / 10,
    max: Math.round(24.9 * heightM * heightM * 10) / 10
  };
}
