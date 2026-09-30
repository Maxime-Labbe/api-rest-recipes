const express = require('express');
const pgp = require('pg-promise')()
const app = express()
app.use(express.json())
const db = pgp('postgres://postgres:admin@localhost:5432/first-api');
const port = 3000

app.get('/recipes', async (req, res) => {
  try {
    const result = await db.manyOrNone('SELECT * FROM recipes."recipe"')
    res.status(200).send(result)
  } catch {
    res.status(500).send("Could not get the recipes")
  }
})

app.get('/recipes/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).send("Missing recipe's id")
    return;
  }
  try {
    const result = await db.oneOrNone('SELECT * FROM recipes."recipe" WHERE "recipe".id = $1', id)
    if (result !== null) {
      res.status(200).send(result)
    } else {
      res.status(404).send("Recipe not found")
    }
  } catch {
    res.status(500).send("Could not get the recipes")
  }
})

app.post('/recipes', async (req, res) => {
  const body = req.body ?? null
  if (!body) {
    res.status(400).send("Missing body")
    return;
  }
  const { name, description, price, category } = body
  if ([name, description, price, category].some(value => value === undefined)) {
    res.status(422).send("Missing properties")
    return;
  }
  try {
    const result = await db.query(
      'INSERT INTO recipes."recipe" (name, description, price, category) VALUES($1, $2, $3, $4) RETURNING *',
      [name, description, price, category]
    )
    res.status(201).send(result)
  } catch {
    res.status(500).send("Could not create the recipe")
  }
})

app.put('/recipes/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body ?? null
  if (!body) {
    res.status(400).send("Missing body")
    return;
  }
  const {name, description, price, category} = body;
  if ([name, description, price, category].some(value => value === undefined)) {
    res.status(422).send("Missing properties")
    return;
  }
  try {
    const result = await db.oneOrNone('UPDATE recipes."recipe" SET name = $1, description = $2, price = $3, category = $4 WHERE "recipe".id = $5 RETURNING *;', [name, description, price, category, id])
     if (!result) {
      res.status(404).send("Recipe not found")
      return
    }
    res.status(200).send(result)
  } catch {
    res.status(500).send("Could not replace recipe")
  }
})

app.patch('/recipes/:id', async (req,res) => {
  const id = req.params.id
  const body = req.body ?? null
  if (!body) {
    res.status(400).send("Missing body")
    return;
  }
  const entries = Object.entries(body)
  if (entries.length === 0) {
    res.status(422).send("Provide at least one recipe property")
    return;
  }

  const properties = entries.map(([field,]) => field)
  const values = entries.map(([, value]) => value)
  const changedProperties = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ')

  try {
    const result = await db.oneOrNone(
      `UPDATE recipes."recipe" SET ${changedProperties} WHERE "recipe".name = '${id}' RETURNING ${properties.join(', ')};`,
      values
    )
    if (!result) {
      res.status(404).send("Recipe not found")
      return
    }
    res.status(200).send(result)
  } catch {
    res.status(500).send("Could not patch recipe")
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})