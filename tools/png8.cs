using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.IO.Compression;
using System.Runtime.InteropServices;

// 把 RGBA 图编码成 PNG-8（调色板 + tRNS），平涂图体积远小于 PNG-32
public static class Png8
{
    static readonly uint[] CrcTable = MakeCrcTable();

    static uint[] MakeCrcTable()
    {
        var t = new uint[256];
        for (uint n = 0; n < 256; n++)
        {
            uint c = n;
            for (int k = 0; k < 8; k++) c = ((c & 1) != 0) ? (0xEDB88320u ^ (c >> 1)) : (c >> 1);
            t[n] = c;
        }
        return t;
    }

    static uint Crc(byte[] buf, int off, int len)
    {
        uint c = 0xFFFFFFFFu;
        for (int i = 0; i < len; i++) c = CrcTable[(c ^ buf[off + i]) & 0xFF] ^ (c >> 8);
        return c ^ 0xFFFFFFFFu;
    }

    static uint Adler(byte[] d)
    {
        uint a = 1, b = 0;
        for (int i = 0; i < d.Length; i++) { a = (a + d[i]) % 65521; b = (b + a) % 65521; }
        return (b << 16) | a;
    }

    static void BE32(Stream s, uint v)
    {
        s.WriteByte((byte)(v >> 24)); s.WriteByte((byte)(v >> 16));
        s.WriteByte((byte)(v >> 8));  s.WriteByte((byte)v);
    }

    static void Chunk(Stream s, string type, byte[] data)
    {
        var t = System.Text.Encoding.ASCII.GetBytes(type);
        BE32(s, (uint)data.Length);
        s.Write(t, 0, 4);
        s.Write(data, 0, data.Length);
        var inp = new byte[4 + data.Length];
        Buffer.BlockCopy(t, 0, inp, 0, 4);
        Buffer.BlockCopy(data, 0, inp, 4, data.Length);
        BE32(s, Crc(inp, 0, inp.Length));
    }

    static int Paeth(int a, int b, int c)
    {
        int p = a + b - c;
        int pa = Math.Abs(p - a), pb = Math.Abs(p - b), pc = Math.Abs(p - c);
        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
    }

    // 逐行挑最优滤波器（PNG 标准的 5 种），按绝对值之和最小
    static byte[] FilterRows(byte[] idx, int w, int h)
    {
        var outp = new byte[h * (w + 1)];
        var prev = new byte[w];
        var cur = new byte[w];
        var cand = new byte[w];
        var best = new byte[w];
        for (int y = 0; y < h; y++)
        {
            Array.Copy(idx, y * w, cur, 0, w);
            int bestType = 0; long bestSum = long.MaxValue;
            for (int ft = 0; ft <= 4; ft++)
            {
                long sum = 0;
                for (int x = 0; x < w; x++)
                {
                    int a = x >= 1 ? cur[x - 1] : 0;
                    int b = prev[x];
                    int c0 = x >= 1 ? prev[x - 1] : 0;
                    int v;
                    switch (ft)
                    {
                        case 0: v = cur[x]; break;
                        case 1: v = cur[x] - a; break;
                        case 2: v = cur[x] - b; break;
                        case 3: v = cur[x] - ((a + b) >> 1); break;
                        default: v = cur[x] - Paeth(a, b, c0); break;
                    }
                    v &= 0xFF;
                    cand[x] = (byte)v;
                    sum += (v < 128) ? v : 256 - v;
                }
                if (sum < bestSum) { bestSum = sum; bestType = ft; Array.Copy(cand, best, w); }
            }
            outp[y * (w + 1)] = (byte)bestType;
            Array.Copy(best, 0, outp, y * (w + 1) + 1, w);
            Array.Copy(cur, prev, w);
        }
        return outp;
    }

    public static string Encode(string src, string dst, int maxColors)
    {
        byte[] buf; int w, h, stride;
        using (var b0 = new Bitmap(src))
        {
            w = b0.Width; h = b0.Height;
            using (var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb))
            {
                using (var g = Graphics.FromImage(bmp)) g.DrawImage(b0, 0, 0, w, h);
                var d = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                stride = d.Stride;
                buf = new byte[stride * h];
                Marshal.Copy(d.Scan0, buf, 0, buf.Length);
                bmp.UnlockBits(d);
            }
        }

        var counts = new Dictionary<uint, int>();
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                int i = y * stride + x * 4;
                if (buf[i + 3] == 0) continue;
                uint k = ((uint)buf[i] << 24) | ((uint)buf[i + 1] << 16) | ((uint)buf[i + 2] << 8) | buf[i + 3];
                int c; counts.TryGetValue(k, out c); counts[k] = c + 1;
            }

        var pal = new List<uint>();
        pal.Add(0u);                       // 索引 0 固定为全透明
        bool exact = counts.Count <= maxColors - 1;
        if (exact)
        {
            foreach (var kv in counts) pal.Add(kv.Key);
        }
        else
        {
            var arr = new List<KeyValuePair<uint, int>>(counts);
            arr.Sort((p, q) => q.Value.CompareTo(p.Value));
            for (int i = 0; i < maxColors - 1 && i < arr.Count; i++) pal.Add(arr[i].Key);
        }

        int n = pal.Count;
        var pR = new byte[n]; var pG = new byte[n]; var pB = new byte[n]; var pA = new byte[n];
        for (int i = 0; i < n; i++)
        {
            uint v = pal[i];
            pR[i] = (byte)(v >> 24); pG[i] = (byte)(v >> 16); pB[i] = (byte)(v >> 8); pA[i] = (byte)v;
        }

        var idx = new byte[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                int i = y * stride + x * 4;
                byte a = buf[i + 3];
                if (a == 0) { idx[y * w + x] = 0; continue; }
                int r = buf[i], gg = buf[i + 1], bb = buf[i + 2];
                int bi = 1; long bd = long.MaxValue;
                for (int p = 1; p < n; p++)
                {
                    int dr = r - pR[p], dg = gg - pG[p], db = bb - pB[p], da = a - pA[p];
                    long d = (long)dr * dr + (long)dg * dg + (long)db * db + (long)da * da * 3;
                    if (d < bd) { bd = d; bi = p; if (d == 0) break; }
                }
                idx[y * w + x] = (byte)bi;
            }

        var filtered = FilterRows(idx, w, h);
        byte[] idat;
        using (var ms = new MemoryStream())
        {
            ms.WriteByte(0x78); ms.WriteByte(0x9C);
            using (var ds = new DeflateStream(ms, CompressionLevel.Optimal, true))
                ds.Write(filtered, 0, filtered.Length);
            BE32(ms, Adler(filtered));
            idat = ms.ToArray();
        }

        var ihdr = new byte[13];
        ihdr[0] = (byte)(w >> 24); ihdr[1] = (byte)(w >> 16); ihdr[2] = (byte)(w >> 8); ihdr[3] = (byte)w;
        ihdr[4] = (byte)(h >> 24); ihdr[5] = (byte)(h >> 16); ihdr[6] = (byte)(h >> 8); ihdr[7] = (byte)h;
        ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8bit, 调色板

        var plte = new byte[n * 3];
        for (int i = 0; i < n; i++) { plte[i * 3] = pR[i]; plte[i * 3 + 1] = pG[i]; plte[i * 3 + 2] = pB[i]; }
        var trns = new byte[n];
        for (int i = 0; i < n; i++) trns[i] = pA[i];

        using (var fs = new FileStream(dst, FileMode.Create, FileAccess.Write))
        {
            fs.Write(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, 0, 8);
            Chunk(fs, "IHDR", ihdr);
            Chunk(fs, "PLTE", plte);
            Chunk(fs, "tRNS", trns);
            Chunk(fs, "IDAT", idat);
            Chunk(fs, "IEND", new byte[0]);
        }
        return string.Format("{0}x{1}|colors={2}{3}|bytes={4}", w, h, n, exact ? "(exact)" : "", new FileInfo(dst).Length);
    }
}