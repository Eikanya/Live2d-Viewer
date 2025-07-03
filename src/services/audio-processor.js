class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // Handle messages from the main thread if needed
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputData = input[0];
      this.port.postMessage(inputData);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
