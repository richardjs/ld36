'use strict'

var express = require('express')
var http = require('http')
var UUID = require('uuid')

var C = require('./constants.js')
var Game = require('./game.js')
var Player = require('./player.js')
var mapgen = require('./mapgen.js')
var time = require('./time.js')
var util = require('./util.js')

var app = express()
var server = http.createServer(app)
var io = require('socket.io')(server)

app.use('/build', express.static('build'))
app.use(express.static('static'))

console.log('initializing game...')
var game = new Game()
console.log('making map...')
game.map.data = mapgen.standard()

var sockets = []

io.on('connection', socket => {
	sockets.push(socket)
	socket.on('disconnect', () => {
		console.log('disconnect ' + socket.id)
		sockets.remove(socket)
		game.entities.remove(socket.player)
	})

	socket.on('input', state => {
		socket.seqnum = state.seqnum
		socket.player.keys = state.keys
	})

	socket.id = UUID.v4()
	console.log('connect ' + socket.id)
	socket.emit('id', socket.id)
	socket.emit('mapData', game.map.data)

	var playerPos = util.centerOfSquare(game.map.findEmptySquare())
	socket.player = new Player(socket.id, playerPos)
	game.entities.push(socket.player)
})

time.timer(() => {
	game.update()
}, 1000/C.GAME_FPS)

time.timer(() => {
	for(var socket of sockets){
		socket.emit('entities', game.entities)
	}
}, 1000/C.NETWORK_FPS)

server.listen(5050, () => {
	console.log('listening...')
})