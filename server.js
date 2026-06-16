require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// 初始化 Supabase 客户端
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

console.log('🔄 正在连接 Supabase...');

// 测试连接
supabase.from('games').select('count', { count: 'exact', head: true })
    .then(() => {
        console.log('✅ Supabase 连接成功');
    })
    .catch(err => {
        console.error('❌ Supabase 连接失败:', err.message);
    });

// ===== API 路由 =====

// 获取所有项目
app.get('/api/games', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .order('id');
        
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 创建项目
app.post('/api/games', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: '项目名称不能为空' });
        
        const { data: game, error } = await supabase
            .from('games')
            .insert({ name })
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: '项目名称已存在' });
            }
            throw error;
        }
        
        // 初始化默认标签
        const defaultTags = [
            { name: '胜利', options: [] },
            { name: '失败', options: ['被 gank', '团战失误', '落单', '操作失误', '视野差', '判断错', '其他'] }
        ];
        
        for (const tag of defaultTags) {
            const { data: tagData } = await supabase
                .from('tags')
                .insert({ game_id: game.id, name: tag.name })
                .select()
                .single();
            
            for (const opt of tag.options) {
                await supabase
                    .from('options')
                    .insert({ tag_id: tagData.id, name: opt });
            }
        }
        
        res.json(game);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除项目
app.delete('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('games')
            .delete()
            .eq('id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取项目的标签和选项
app.get('/api/games/:id/tags', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: tags, error } = await supabase
            .from('tags')
            .select('id, name')
            .eq('game_id', parseInt(id));
        
        if (error) throw error;
        
        for (const tag of tags) {
            const { data: options } = await supabase
                .from('options')
                .select('id, name')
                .eq('tag_id', tag.id);
            
            tag.options = options || [];
        }
        
        res.json(tags || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加选项
app.post('/api/games/:id/options', async (req, res) => {
    try {
        const { id } = req.params;
        const { tagName, optionName } = req.body;
        
        if (!tagName || !optionName) {
            return res.status(400).json({ error: '参数不完整' });
        }
        
        const { data: tag } = await supabase
            .from('tags')
            .select('id')
            .eq('game_id', parseInt(id))
            .eq('name', tagName)
            .single();
        
        if (!tag) {
            return res.status(404).json({ error: '标签不存在' });
        }
        
        const { data: option, error } = await supabase
            .from('options')
            .insert({ tag_id: tag.id, name: optionName })
            .select()
            .single();
        
        if (error) throw error;
        res.json(option);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除选项
app.delete('/api/options/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('options')
            .delete()
            .eq('id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取项目的记录
app.get('/api/games/:id/records', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        
        const { data, error } = await supabase
            .from('records')
            .select('id, tag_name, option_name, created_at')
            .eq('game_id', parseInt(id))
            .order('id', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加记录
app.post('/api/games/:id/records', async (req, res) => {
    try {
        const { id } = req.params;
        const { tagName, optionName } = req.body;
        
        if (!tagName) {
            return res.status(400).json({ error: '标签名不能为空' });
        }
        
        const { data, error } = await supabase
            .from('records')
            .insert({
                game_id: parseInt(id),
                tag_name: tagName,
                option_name: optionName || null
            })
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除记录
app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('records')
            .delete()
            .eq('id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 清空项目记录
app.delete('/api/games/:id/records', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('records')
            .delete()
            .eq('game_id', parseInt(id));
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取统计信息
app.get('/api/games/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: options } = await supabase
            .from('options')
            .select('name')
            .in('tag_id', 
                supabase.from('tags').select('id').eq('game_id', parseInt(id))
            );
        
        const stats = {};
        (options || []).forEach(opt => {
            stats[opt.name] = 0;
        });
        
        const { data: counts } = await supabase
            .from('records')
            .select('option_name')
            .eq('game_id', parseInt(id))
            .not('option_name', 'is', null);
        
        (counts || []).forEach(record => {
            if (stats.hasOwnProperty(record.option_name)) {
                stats[record.option_name]++;
            }
        });
        
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 数据库：Supabase 云端`);
    console.log(`🔗 项目 URL: ${process.env.SUPABASE_URL}`);
});
