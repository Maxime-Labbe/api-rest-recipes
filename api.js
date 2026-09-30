const express = require('express');
const pgp = require('pg-promise')()
const app = express()
app.use(express.json())
const db = pgp('postgres://postgres:admin@localhost:5432/first-api');
const port = 3000

app.get('/products', async (req, res) => {
  try {
    const result = await db.manyOrNone('SELECT * FROM products."product"')
    res.status(200).send(result)
  } catch {
    res.status(500).send("Could not get the products")
  }
})

app.get('/products/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).send("Missing product's id")
    return;
  }
  try {
    const result = await db.oneOrNone('SELECT * FROM products."product" WHERE "product".id = $1', id)
    if (result !== null) {
      res.status(200).send(result)
    } else {
      res.status(404).send("Product not found")
    }
  } catch {
    res.status(500).send("Could not get the products")
  }
})

app.post('/products', async (req, res) => {
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
      'INSERT INTO products."product" (name, description, price, category) VALUES($1, $2, $3, $4) RETURNING *',
      [name, description, price, category]
    )
    res.status(201).send(result)
  } catch {
    res.status(500).send("Could not create the product")
  }
})

app.put('/products/:id', async (req, res) => {
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
    const result = await db.oneOrNone('UPDATE products."product" SET name = $1, description = $2, price = $3, category = $4 WHERE "product".id = $5 RETURNING *;', [name, description, price, category, id])
     if (!result) {
      res.status(404).send("Product not found")
      return
    }
    res.status(200).send(result)
  } catch {
    res.status(500).send("Could not replace product")
  }
})

app.patch('/products/:id', async (req,res) => {
  const id = req.params.id
  const body = req.body ?? null
  if (!body) {
    res.status(400).send("Missing body")
    return;
  }
  const entries = Object.entries(body)
  if (entries.length === 0) {
    res.status(422).send("Provide at least one product property")
    return;
  }

  const properties = entries.map(([field,]) => field)
  const values = entries.map(([, value]) => value)
  const changedProperties = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ')

  try {
    const result = await db.oneOrNone(
      `UPDATE products."product" SET ${changedProperties} WHERE "product".name = '${id}' RETURNING ${properties.join(', ')};`,
      values
    )
    if (!result) {
      res.status(404).send("Product not found")
      return
    }
    res.status(200).send(result)
  } catch {
    res.status(500).send("Could not patch product")
  }
})

app.delete('/products/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).send("Missing product's id")
    return;
  }
  try {
    const result = await db.oneOrNone('DELETE FROM products."product" WHERE "product".id = $1 RETURNING id', id)
    if (result !== null) {
      res.status(204).send()
    } else {
      res.status(404).send("Product not found")
    }
  } catch {
    res.status(500).send("Could not get the products")
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})