/* global FormData */

import React from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Collapse from 'react-bootstrap/Collapse'
import Container from 'react-bootstrap/Container'
import ListGroup from 'react-bootstrap/ListGroup'
import Row from 'react-bootstrap/Row'
import Spinner from 'react-bootstrap/Spinner'
import 'whatwg-fetch'
import './bootstrap.min.css'
import config from './config'
import header from './header.png'

if (config.api.charAt(config.api.length - 1) !== '/') config.api += '/'

class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      file: false,
      error: false,
      converting: false,
      current: 'Loading...',
      latest: 'Loading...'
    }
    this.fileInput = React.createRef()
    this.file = undefined

    window.fetch(config.api)
      .then(res => res.json())
      .then(json => {
        const current = json.current
        const latest = json.latest
        this.setState({ current, latest })
      })
      .catch(() => this.setState({ error: 'The API doesn\'t respond.' }))
  }

  static openLinks (e) {
    e.preventDefault()
    window.open('https://github.com/raftario/songe-converter-web', '_blank')
    window.open('https://github.com/lolPants/songe-converter', '_blank')
  }

  updateSonge = () => {
    if (this.state.current === 'Loading...' || this.state.latest === 'Loading...') return false

    const current = this.state.current.split('.').map(s => Number(s))
    const latest = this.state.latest.split('.').map(s => Number(s))

    if (current[0] < latest[0]) return true
    else if (current[1] < latest[1]) return true
    else return current[2] < latest[2]
  }

  selectFile = e => {
    e.preventDefault()
    this.fileInput.current.click()
  }

  submitFile = e => {
    e.preventDefault()

    if (this.file) {
      const formData = new FormData()
      formData.append('zip', this.file)
      const options = {
        method: 'POST',
        body: formData
      }

      this.setState({ converting: true })

      window.fetch(`${config.api}upload`, options)
        .then(res => res.json())
        .then(json => {
          if (!json.error) window.open(`${config.api}${json.url}`, '_blank')
          this.setState({
            file: false,
            error: json.error,
            converting: false
          })
          this.file = undefined
        })
        .catch(() =>
          this.setState({ converting: false, error: 'An error occured while trying to upload the file.' })
        )
    } else this.setState({ error: 'A file needs to be selected.' })
  }

  handleFIChange = e => {
    const file = e.target.files[0]

    if (!file) {
      this.file = undefined
      this.setState({ file: false, error: false })
    } else {
      if (file.size > 2 * 1024 * 1024) {
        this.file = undefined
        this.setState({ file: false, error: 'The selected file is too large (max size is 2MB).' })
      } else if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
        this.file = undefined
        this.setState({ file: false, error: 'The selected file is not in a valid format.' })
      } else {
        this.file = file
        this.setState({ file: file.name, error: false })
      }
    }
  }

  render () {
    return (
      <Container className='p-3' id='App'>
        <Collapse in={!!this.state.error}>
          <div>
            <Alert variant='danger'>{this.state.error}</Alert>
          </div>
        </Collapse>
        <Card>
          <Card.Img variant='top' src={header} />
          <Card.Body>
            <Card.Text className='lead'>
              Just select your song and hit Convert !
            </Card.Text>
            <Card.Text>
              Your song must be compressed in a <code>.zip</code> file. You should remove the <code>song.ogg</code> file
              and other unnecessary files from the <code>.zip</code> before uploading your song. You can put multiple
              songs in the same file as long as it doesn't exceed the size limit (2MB).
            </Card.Text>
            <Row>
              <Col>
                <Button variant='outline-secondary' size='lg' onClick={this.selectFile} block>
                  {this.state.file || 'Select file'}
                </Button>
              </Col>
              <Col className='text-right'>
                <Button variant='secondary' size='lg' disabled={!this.state.file} onClick={this.submitFile} block>
                  {this.state.converting
                    ? <>Converting <Spinner as='span' size='sm' animation='border' role='status' /></>
                    : 'Convert'
                  }
                </Button>
              </Col>
            </Row>
          </Card.Body>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <Row>
                <Col>
                  Current version: <code>{this.state.current}</code>
                </Col>
                <Col className='text-center'>
                  Latest version: <code>{this.state.latest}</code>
                </Col>
                <Col className='text-right'>
                  <Button variant='outline-secondary' size='sm' disabled={!this.updateSonge()}>Update</Button>
                </Col>
              </Row>
            </ListGroup.Item>
            <ListGroup.Item>
              <Row>
                <Col>
                  <small className='text-muted'>Songe Converter by lolPants</small>
                </Col>
                <Col className='text-center'>
                  <small className='text-muted'>Web app by Raphaël Thériault</small>
                </Col>
                <Col className='text-right'>
                  <small className='text-muted'><a href='#App' onClick={App.openLinks}>View on GitHub</a></small>
                </Col>
              </Row>
            </ListGroup.Item>
          </ListGroup>
        </Card>
        <input
          className='d-none'
          type='file' name='zip'
          accept='application/zip'
          ref={this.fileInput}
          onChange={this.handleFIChange}
        />
      </Container>
    )
  }
}

export default App
