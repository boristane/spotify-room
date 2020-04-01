import User from "../models/user";
import mongoose from "mongoose";

export async function create(
  product: string,
  birthdate: string,
  country: string,
  followers: number,
  score: number,
  term: string
) {
  const created = new Date();
  const updated = created;
  const user = new User({
    _id: mongoose.Types.ObjectId(),
    product,
    birthdate,
    country,
    created,
    updated,
    followers,
    score,
    term
  });
  await user.save();
}

export async function saveToDB(
  product: string,
  birthdate: string,
  country: string,
  followers: number,
  score: number,
  term: string
) {
  await create(product, birthdate, country, followers, score, term);
}

export async function getScorePercentage(score: number) {
  const users = await User.find({ score: { $gte: 0 } }).exec();
  const step = 10;
  const bins: { value: number; numOccurences: number }[] = [];
  users.forEach(user => {
    const bin = bins.find(b => Math.abs(user.score - b.value) <= step);
    if (bin) bin.numOccurences += 1;
    else {
      bins.push({
        value: ceilToNextPercent(user.score, step),
        numOccurences: 1
      });
    }
  });
  bins.sort((a, b) => a.value - b.value);
  const total = users.length;
  const current = bins
    .filter(bin => bin.value >= score)
    .reduce((acc, curr) => acc + curr.numOccurences, 0);
  let percentage = current / total;
  if (percentage === 0) percentage = 0.01;
  if (percentage === 1) percentage = 0.99;
  return percentage * 100;
}

function ceilToNextPercent(num, p) {
  return Math.ceil(num / p) * p;
}
