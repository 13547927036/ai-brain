// 贴图预处理：去底 -> 按内容裁边 -> 缩放。
// 用法见 tools/prep-sprites.ps1。放仓库里是为了记录素材怎么来的，便于重新生成。
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class SpritePrep
{
    static byte[] KeyOut(Bitmap src, int tol, out long removed)
    {
        int w = src.Width, h = src.Height;
        var work = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(work)) g.DrawImage(src, 0, 0, w, h);
        var rect = new Rectangle(0, 0, w, h);
        var data = work.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        byte[] buf = new byte[stride * h];
        Marshal.Copy(data.Scan0, buf, 0, buf.Length);
        work.UnlockBits(data);
        work.Dispose();

        var visited = new bool[w * h];
        var stack = new Stack<int>();
        for (int x = 0; x < w; x++) { stack.Push(x); stack.Push((h - 1) * w + x); }
        for (int y = 0; y < h; y++) { stack.Push(y * w); stack.Push(y * w + w - 1); }
        removed = 0;
        while (stack.Count > 0)
        {
            int idx = stack.Pop();
            if (idx < 0 || idx >= w * h || visited[idx]) continue;
            visited[idx] = true;
            int x = idx % w, y = idx / w;
            int i = y * stride + x * 4;
            if (!(buf[i] >= 255 - tol && buf[i + 1] >= 255 - tol && buf[i + 2] >= 255 - tol)) continue;
            buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
            removed++;
            if (x > 0) stack.Push(idx - 1);
            if (x < w - 1) stack.Push(idx + 1);
            if (y > 0) stack.Push(idx - w);
            if (y < h - 1) stack.Push(idx + w);
        }
        return buf;
    }

    static int[] BBox(byte[] buf, int w, int h, int stride, int alphaMin)
    {
        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
        {
            int row = y * stride;
            for (int x = 0; x < w; x++)
                if (buf[row + x * 4 + 3] > alphaMin)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
        }
        if (maxX < 0) return null;
        return new int[] { minX, minY, maxX, maxY };
    }

    static Bitmap CropResize(byte[] buf, int w, int h, int stride, int sx, int sy, int side, int size, int padPx)
    {
        var full = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        var rect = new Rectangle(0, 0, w, h);
        var data = full.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(buf, 0, data.Scan0, buf.Length);
        full.UnlockBits(data);

        var crop = new Rectangle(sx, sy, side, side);
        var dst = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(dst))
        {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.Clear(Color.Transparent);
            int inner = size - padPx * 2;
            g.DrawImage(full, new Rectangle(padPx, padPx, inner, inner), crop, GraphicsUnit.Pixel);
        }
        full.Dispose();
        return dst;
    }

    public static string Process(string srcN, string srcH, string dstN, string dstH, int size, double padRatio, int tol)
    {
        using (var bn = new Bitmap(srcN))
        using (var bh = new Bitmap(srcH))
        {
            long remN, remH;
            var bufN = KeyOut(bn, tol, out remN);
            var bufH = KeyOut(bh, tol, out remH);
            int w = bn.Width, h = bn.Height;
            int stride = w * 4;

            var bbN = BBox(bufN, w, h, stride, 16);
            var bbH = BBox(bufH, w, h, stride, 16);
            if (bbN == null) return "ERR|normal transparent";
            if (bbH == null) return "ERR|hit transparent";

            int minX = Math.Min(bbN[0], bbH[0]);
            int minY = Math.Min(bbN[1], bbH[1]);
            int maxX = Math.Max(bbN[2], bbH[2]);
            int maxY = Math.Max(bbN[3], bbH[3]);
            int cw = maxX - minX + 1, ch = maxY - minY + 1;
            int side = (int)(Math.Max(cw, ch) * (1.0 + padRatio));
            if (side > w) side = w;
            int cx = minX + cw / 2 - side / 2;
            int cy = minY + ch / 2 - side / 2;
            if (cx < 0) cx = 0;
            if (cy < 0) cy = 0;
            if (cx + side > w) cx = w - side;
            if (cy + side > h) cy = h - side;

            int padPx = Math.Max(1, size / 32);
            using (var outN = CropResize(bufN, w, h, stride, cx, cy, side, size, padPx))
            using (var outH = CropResize(bufH, w, h, stride, cx, cy, side, size, padPx))
            {
                outN.Save(dstN, ImageFormat.Png);
                outH.Save(dstH, ImageFormat.Png);
            }
            return string.Format("{0}|{1}|{2}|{3}|{4}", Math.Round(remN * 100.0 / (w * h), 1), Math.Round(remH * 100.0 / (w * h), 1), cw, ch, side);
        }
    }
}