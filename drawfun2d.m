function drawfun2d
x = 0:0.01:4;
y = -1:0.01:1.5;

z = zeros(length(y), length(x));
for j = 1:length(y)
    for i = 1:length(x)
        z(j,i) = obj(x(i), y(j));
    end
end

contourf(x, y, z, 40, 'LineColor', 'none');
colorbar;
xlabel('x');
ylabel('y');
title('Contour plot of f(x,y)');
hold on;
end
