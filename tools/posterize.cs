using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class Posterize
{
    public static long Run(string path, int bits, int alphaCut)
    {
        string tmp = path + ".tmp.png";
        using (var bmp = new Bitmap(path))
        {
            int w = bmp.Width, h = bmp.Height;
            var rect = new Rectangle(0, 0, w, h);
            var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            byte[] buf = new byte[stride * h];
            Marshal.Copy(data.Scan0, buf, 0, buf.Length);
            int levels = (1 << bits) - 1;
            for (int i = 0; i < buf.Length; i += 4)
            {
                if (buf[i + 3] <= alphaCut) { buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0; continue; }
                buf[i]     = (byte)Math.Round(Math.Round(buf[i]     * levels / 255.0) * 255.0 / levels);
                buf[i + 1] = (byte)Math.Round(Math.Round(buf[i + 1] * levels / 255.0) * 255.0 / levels);
                buf[i + 2] = (byte)Math.Round(Math.Round(buf[i + 2] * levels / 255.0) * 255.0 / levels);
            }
            Marshal.Copy(buf, 0, data.Scan0, buf.Length);
            bmp.UnlockBits(data);
            bmp.Save(tmp, ImageFormat.Png);   // 先写临时文件，避开文件占用
        }
        File.Delete(path);
        File.Move(tmp, path);
        return new FileInfo(path).Length;
    }
}