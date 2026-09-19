// Native macOS rasterization of CueFlow's public/favicon.svg geometry.
// Run from the project root: swift scripts/generate-icons.swift
import AppKit

let size = 1024
let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
    isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0
)!
NSGraphicsContext.saveGraphicsState()
let context = NSGraphicsContext(bitmapImageRep: bitmap)!
NSGraphicsContext.current = context
context.shouldAntialias = true

let transform = AffineTransform(translationByX: 64, byY: 64)
let scale: CGFloat = 14
func point(_ x: CGFloat, _ y: CGFloat) -> NSPoint {
    transform.transform(NSPoint(x: x * scale, y: y * scale))
}

NSColor(srgbRed: 109 / 255, green: 74 / 255, blue: 1, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 64, y: 64, width: 896, height: 896), xRadius: 252, yRadius: 252).fill()

NSColor.white.setStroke()
let chevron = NSBezierPath()
chevron.move(to: point(23, 18))
chevron.line(to: point(42, 32))
chevron.line(to: point(23, 46))
chevron.lineWidth = 7 * scale
chevron.lineCapStyle = .round
chevron.lineJoinStyle = .round
chevron.stroke()

NSColor.white.withAlphaComponent(0.45).setStroke()
let cue = NSBezierPath()
cue.move(to: point(13, 24))
cue.line(to: point(13, 40))
cue.lineWidth = 5 * scale
cue.lineCapStyle = .round
cue.stroke()

NSGraphicsContext.restoreGraphicsState()
let destination = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("build/icon.png")
try bitmap.representation(using: .png, properties: [:])!.write(to: destination)
print("Created \(destination.path)")
