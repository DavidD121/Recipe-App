
create or replace function to_grams(p_item_id bigint, p_amount numeric, p_unit_id bigint)
returns numeric language sql stable as $$
    select case d.name
      when 'mass' then u.factor_to_base * p_amount
      when 'volume' then u.factor_to_base * i.grams_per_ml * p_amount
      when 'count' then w.grams_per_item * p_amount
    end
    from units u
    join dimensions d on d.dimension_id = u.dimension_id
    join items given_item on given_item.item_id = p_item_id
    join items i on i.item_id = coalesce(given_item.canonical_item_id, given_item.item_id) /* resolve canonical item id */
    left join weights_per_count w on w.item_id = i.item_id and w.unit_id = p_unit_id
    where u.unit_id = p_unit_id;
$$;