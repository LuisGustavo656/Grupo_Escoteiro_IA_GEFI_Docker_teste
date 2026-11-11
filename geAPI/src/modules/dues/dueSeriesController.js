const pool = require('../../config/database');

exports.generateSixDues = async (req, res) => {
  const body = req.body || {};
  const memberId = Number(body.member_id);
  const branchId = Number(body.branch_id);
  const amount = Number(body.amount);
  const day = Number(body.due_day);
  // Compatibilidade com o frontend anterior, que gerava seis meses.
  const count = body.repeat_months === undefined ? 6 : body.repeat_months;
  if (![6, 12].includes(count)) return res.status(400).json({error:'Selecione 6 ou 12 meses.'});
  const reference = body.reference_month;
  if (!Number.isSafeInteger(memberId) || memberId <= 0 || !Number.isSafeInteger(branchId) || branchId <= 0 ||
      !Number.isFinite(amount) || amount <= 0 || amount > 10000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 ||
      typeof reference !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(reference)) {
    return res.status(400).json({error:'Confira membro, ramo, valor e referência.'});
  }
  const [year, month] = reference.split('-').map(Number);
  if (year < 1000 || year > 9998 || !Number.isInteger(day) || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
    return res.status(400).json({error:'Informe um vencimento válido dentro do primeiro mês.'});
  }
  const plan = Array.from({length:count}, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    const prefix = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
    return {reference:`${prefix}-01`, dueDate:`${prefix}-${String(Math.min(day,lastDay)).padStart(2,'0')}`};
  });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const member = await client.query('SELECT id, name FROM members WHERE id = $1 AND branch_id = $2 FOR UPDATE', [memberId, branchId]);
    if (!member.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({error:'Membro não encontrado no ramo selecionado.'});
    }
    const created = [];
    const skipped = [];
    for (const item of plan) {
      const result = await client.query(
        `INSERT INTO dues (member_id, branch_id, reference_month, due_date, amount, status)
         VALUES ($1, $2, $3, $4, $5, 'pendente')
         ON CONFLICT (member_id, reference_month) DO NOTHING RETURNING *`,
        [memberId, branchId, item.reference, item.dueDate, amount]
      );
      if (result.rows.length) created.push(result.rows[0]);
      else skipped.push(item.reference);
    }
    await client.query('COMMIT');
    return res.status(created.length ? 201 : 200).json({
      message:`${created.length} mensalidade(s) criada(s) para ${member.rows[0].name}. ${skipped.length} já existente(s), mantida(s) sem alteração.`,
      dues:created, skipped,
      first_reference:plan[0].reference, last_reference:plan[count - 1].reference,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Falha ao gerar mensalidades:', error);
    return res.status(500).json({error:'Não foi possível concluir a geração. Atualize a lista antes de tentar novamente.'});
  } finally { if (client) client.release(); }
};
