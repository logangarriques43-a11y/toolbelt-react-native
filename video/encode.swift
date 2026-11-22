// Encodes numbered PNG frames (from video/render.mjs) into an H.264 MP4 with
// Apple's AVFoundation, so no ffmpeg install is needed and iPhones play the
// result inline.
//
//   swift video/encode.swift <framesDir> <out.mp4> [fps=30]

import AVFoundation
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("usage: swift encode.swift <framesDir> <out.mp4> [fps]")
    exit(2)
}
let framesDir = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let fps = Int32(args.count > 3 ? Int(args[3]) ?? 30 : 30)

let frames = try FileManager.default.contentsOfDirectory(atPath: framesDir.path)
    .filter { $0.hasSuffix(".png") }
    .sorted()
guard let first = NSImage(contentsOf: framesDir.appendingPathComponent(frames[0])),
      let firstCG = first.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fatalError("cannot read first frame")
}
let width = firstCG.width, height = firstCG.height

try? FileManager.default.removeItem(at: outURL)
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 2_500_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
    ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.shouldOptimizeForNetworkUse = true  // moov atom up front: starts playing before fully downloaded
writer.startWriting()
writer.startSession(atSourceTime: .zero)

for (i, name) in frames.enumerated() {
    autoreleasepool {
        guard let image = NSImage(contentsOf: framesDir.appendingPathComponent(name)),
              let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            fatalError("cannot read \(name)")
        }
        var buffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
        guard let pb = buffer else { fatalError("no pixel buffer") }
        CVPixelBufferLockBaseAddress(pb, [])
        let ctx = CGContext(
            data: CVPixelBufferGetBaseAddress(pb), width: width, height: height, bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
        CVPixelBufferUnlockBaseAddress(pb, [])
        while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
        adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
    }
}

input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed {
    fatalError("encode failed: \(String(describing: writer.error))")
}
print("wrote \(frames.count) frames → \(outURL.path)")
